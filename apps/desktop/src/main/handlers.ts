import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	EngineEventEmitter,
	FlowExecutionError,
	deleteRequest as deleteRequestFile,
	ensureCollectionsDir,
	executeFlow,
	listRequests,
	loadRequest as loadRequestFile,
	loadSecrets,
	loadWorkspace,
	saveRequest as saveRequestFile,
} from "@quester/engine";
import type {
	EnvironmentV1,
	FlowV1,
	RequestV1,
	SecretsV1,
} from "@quester/schema";
import {
	ENVIRONMENT_VERSION,
	FLOW_VERSION,
	REQUEST_VERSION,
	SECRETS_VERSION,
	secretsSchemaV1,
	validateEnvironment,
	validateFlow,
	validateRequest,
} from "@quester/schema";
import {
	TLS_INSECURE_HINT,
	formatErrorForConsole,
	isTlsCertificateError,
	serializeError,
} from "../shared/errors.js";
import type {
	ExecuteRequestRpcResult,
	ExecutionLogEntry,
	RequestMeta,
	SecretFileMeta,
} from "../shared/rpc.js";

function insecureTlsEnabled(): boolean {
	return (
		process.env.QUESTR_INSECURE_TLS === "1" ||
		process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0"
	);
}

/** Bun-aware fetch that can skip TLS verification for local/dev. */
function createExecutionFetch(): typeof fetch {
	if (!insecureTlsEnabled()) return fetch;
	return ((input: RequestInfo | URL, init?: RequestInit) =>
		fetch(input, {
			...init,
			// Bun extension — ignored by standard fetch typings
			tls: { rejectUnauthorized: false },
		} as RequestInit)) as typeof fetch;
}

function resolveDefaultWorkspaceRoot(): string {
	const relative = join("examples", "sample-workspace");
	let dir = process.cwd();
	for (let i = 0; i < 12; i++) {
		const candidate = join(dir, relative);
		if (existsSync(join(candidate, "quester.json"))) {
			return candidate;
		}
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return resolve(
		dirname(fileURLToPath(import.meta.url)),
		"../../../../examples/sample-workspace",
	);
}

export const defaultWorkspaceRoot = resolveDefaultWorkspaceRoot();

export async function getDefaultWorkspace(): Promise<string> {
	return defaultWorkspaceRoot;
}

export async function openWorkspace(path?: string) {
	const root = path ?? defaultWorkspaceRoot;
	return loadWorkspace(root);
}

export async function openWorkspaceSummary(path: string) {
	const ws = await openWorkspace(path);
	return {
		name: ws.manifest.name,
		root: ws.root,
		envNames: Object.keys(ws.environments),
		flowCount: Object.keys(ws.flows).length,
	};
}

export async function listFlows(workspace?: string) {
	const ws = await openWorkspace(workspace);
	return Object.values(ws.flows).map((f) => ({
		id: f.id,
		name: f.name ?? f.id,
	}));
}

export async function listEnvs(workspace: string) {
	const ws = await openWorkspace(workspace);
	return Object.keys(ws.environments);
}

export async function loadFlow(
	flowId: string,
	workspace: string,
): Promise<FlowV1> {
	const ws = await openWorkspace(workspace);
	const flow = ws.flows[flowId];
	if (!flow) throw new Error(`Flow not found: ${flowId}`);
	return flow;
}

export async function executeFlowRpc(
	flowId: string,
	options?: { env?: string; input?: unknown; workspace?: string },
) {
	const root = options?.workspace
		? resolve(options.workspace)
		: defaultWorkspaceRoot;
	const ws = await loadWorkspace(root);
	const flow = ws.flows[flowId];
	if (!flow) throw new Error(`Flow not found: ${flowId}`);
	const validated = validateFlow(flow);
	if (!validated.success) throw new Error(validated.error);
	const envName = options?.env ?? "local";
	const envVars = ws.environments[envName]?.variables ?? {};
	const secrets = await loadSecrets(root, envName, ws.manifest.environmentsDir);

	const logs: ExecutionLogEntry[] = [];
	const pushLog = (
		level: ExecutionLogEntry["level"],
		message: string,
		extra?: Omit<ExecutionLogEntry, "ts" | "level" | "message">,
	) => {
		logs.push({ ts: Date.now(), level, message, ...extra });
	};

	const events = new EngineEventEmitter();
	events.on("node:before", ({ nodeId, type }) => {
		pushLog("info", `→ ${type} (${nodeId})`, {
			nodeId,
			nodeType: type,
			phase: "before",
		});
	});
	events.on("node:after", ({ nodeId, type, input, output }) => {
		pushLog("info", `✓ ${type} (${nodeId})`, {
			nodeId,
			nodeType: type,
			phase: "after",
			data: { input, output },
		});
	});
	events.on("node:error", ({ nodeId, type, input, error }) => {
		const { message, detail } = serializeError(error);
		const data: Record<string, unknown> = { input, error: detail };
		if (
			error &&
			typeof error === "object" &&
			"request" in error &&
			(error as { name?: string }).name === "HttpNodeError"
		) {
			data.request = (error as { request: unknown }).request;
		}
		pushLog("error", `✗ ${type} (${nodeId}): ${message}`, {
			nodeId,
			nodeType: type,
			phase: "error",
			data,
		});
		if (isTlsCertificateError(error)) {
			pushLog("error", TLS_INSECURE_HINT, {
				nodeId,
				nodeType: type,
				phase: "error",
			});
		}
	});
	events.on("flow:complete", ({ output }) => {
		pushLog("info", "Flow complete", {
			phase: "complete",
			data: { output },
		});
	});

	pushLog("info", `Run started · env=${envName}`, { phase: "start" });
	if (insecureTlsEnabled()) {
		pushLog(
			"info",
			"TLS verification disabled (QUESTR_INSECURE_TLS / NODE_TLS_REJECT_UNAUTHORIZED)",
			{
				phase: "start",
			},
		);
	}

	try {
		const result = await executeFlow(validated.data, {
			input: options?.input ?? {},
			env: envVars,
			secrets,
			events,
			fetch: createExecutionFetch(),
		});
		return { ...result, logs };
	} catch (error) {
		const msg = formatErrorForConsole(error);
		pushLog("error", msg);
		if (error instanceof FlowExecutionError) {
			return {
				...error.partial,
				logs,
				error: error.message,
				failedNodeId: error.failedNodeId,
			};
		}
		throw error;
	}
}

export async function saveFlow(
	flow: FlowV1,
	workspace: string,
): Promise<FlowV1> {
	const validated = validateFlow(flow);
	if (!validated.success) throw new Error(validated.error);

	const root = resolve(workspace);
	const ws = await loadWorkspace(root);
	const filePath = join(
		root,
		ws.manifest.flowsDir,
		`${validated.data.id}.flow.json`,
	);
	await writeFile(
		filePath,
		`${JSON.stringify(validated.data, null, 2)}\n`,
		"utf8",
	);
	return validated.data;
}

export async function createFlow(
	workspace: string,
	flowId: string,
	name?: string,
): Promise<FlowV1> {
	const root = resolve(workspace);
	const ws = await loadWorkspace(root);
	if (ws.flows[flowId]) {
		throw new Error(`Flow already exists: ${flowId}`);
	}
	const flow: FlowV1 = {
		id: flowId,
		version: FLOW_VERSION,
		name: name ?? flowId,
		nodes: [
			{
				id: "input",
				type: "input",
				data: { label: "Input" },
				position: { x: 80, y: 120 },
			},
		],
		edges: [],
	};
	return saveFlow(flow, workspace);
}

export async function deleteFlow(
	flowId: string,
	workspace: string,
): Promise<void> {
	const root = resolve(workspace);
	const ws = await loadWorkspace(root);
	if (!ws.flows[flowId]) {
		throw new Error(`Flow not found: ${flowId}`);
	}
	const filePath = join(root, ws.manifest.flowsDir, `${flowId}.flow.json`);
	await unlink(filePath);
}

export async function renameFlow(
	workspace: string,
	flowId: string,
	newId: string,
	name?: string,
): Promise<FlowV1> {
	if (flowId === newId) {
		const flow = await loadFlow(flowId, workspace);
		if (name && name !== flow.name) {
			return saveFlow({ ...flow, name }, workspace);
		}
		return flow;
	}
	const flow = await loadFlow(flowId, workspace);
	const updated: FlowV1 = {
		...flow,
		id: newId,
		name: name ?? flow.name,
	};
	await saveFlow(updated, workspace);
	await deleteFlow(flowId, workspace);
	return updated;
}

export async function listSecretNames(
	workspace: string,
	env: string,
): Promise<string[]> {
	const secrets = await loadSecretsFile(workspace, env).catch(() => null);
	if (!secrets) return [];
	return Object.keys(secrets.secrets);
}

export async function loadEnvironment(
	workspace: string,
	envName: string,
): Promise<EnvironmentV1> {
	const ws = await openWorkspace(workspace);
	const env = ws.environments[envName];
	if (!env) throw new Error(`Environment not found: ${envName}`);
	return env;
}

export async function saveEnvironment(
	workspace: string,
	environment: EnvironmentV1,
): Promise<EnvironmentV1> {
	const validated = validateEnvironment(environment);
	if (!validated.success) throw new Error(validated.error);

	const root = resolve(workspace);
	const ws = await loadWorkspace(root);
	const filePath = join(
		root,
		ws.manifest.environmentsDir,
		`${validated.data.name}.json`,
	);
	await writeFile(
		filePath,
		`${JSON.stringify(validated.data, null, 2)}\n`,
		"utf8",
	);
	return validated.data;
}

export async function createEnvironment(
	workspace: string,
	envName: string,
): Promise<EnvironmentV1> {
	const ws = await openWorkspace(workspace);
	if (ws.environments[envName]) {
		throw new Error(`Environment already exists: ${envName}`);
	}
	const environment: EnvironmentV1 = {
		name: envName,
		version: ENVIRONMENT_VERSION,
		variables: {},
	};
	return saveEnvironment(workspace, environment);
}

export async function listSecretFiles(
	workspace: string,
): Promise<SecretFileMeta[]> {
	const root = resolve(workspace);
	const ws = await loadWorkspace(root);
	const dir = join(root, ws.manifest.environmentsDir);
	let files: string[] = [];
	try {
		files = await readdir(dir);
	} catch {
		return [];
	}
	return files
		.filter((f) => f.endsWith(".secrets.json"))
		.map((f) => {
			const envName = f.replace(/\.secrets\.json$/, "");
			return { envName, fileName: f };
		})
		.sort((a, b) => a.envName.localeCompare(b.envName));
}

export async function loadSecretsFile(
	workspace: string,
	envName: string,
): Promise<SecretsV1> {
	const root = resolve(workspace);
	const ws = await loadWorkspace(root);
	const path = join(
		root,
		ws.manifest.environmentsDir,
		`${envName}.secrets.json`,
	);
	try {
		const raw = JSON.parse(await readFile(path, "utf8")) as unknown;
		const parsed = secretsSchemaV1.safeParse(raw);
		if (!parsed.success) {
			throw new Error(`Invalid secrets file: ${envName}.secrets.json`);
		}
		return parsed.data;
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Invalid secrets")) {
			throw error;
		}
		throw new Error(`Secrets file not found: ${envName}.secrets.json`);
	}
}

export async function saveSecretsFile(
	workspace: string,
	envName: string,
	secrets: SecretsV1,
): Promise<SecretsV1> {
	const parsed = secretsSchemaV1.safeParse(secrets);
	if (!parsed.success) {
		throw new Error(parsed.error.message);
	}
	const root = resolve(workspace);
	const ws = await loadWorkspace(root);
	const path = join(
		root,
		ws.manifest.environmentsDir,
		`${envName}.secrets.json`,
	);
	await writeFile(path, `${JSON.stringify(parsed.data, null, 2)}\n`, "utf8");
	return parsed.data;
}

export async function createSecretsFile(
	workspace: string,
	envName: string,
): Promise<SecretsV1> {
	try {
		await loadSecretsFile(workspace, envName);
		throw new Error(`Secrets file already exists: ${envName}.secrets.json`);
	} catch (error) {
		if (
			error instanceof Error &&
			!error.message.startsWith("Secrets file not found")
		) {
			throw error;
		}
	}
	const secrets: SecretsV1 = {
		version: SECRETS_VERSION,
		secrets: {},
	};
	return saveSecretsFile(workspace, envName, secrets);
}

export async function pickWorkspaceFolder(): Promise<string | null> {
	const { Utils } = await import("electrobun/bun");
	const paths = await Utils.openFileDialog({
		canChooseDirectory: true,
		canChooseFiles: false,
		allowsMultipleSelection: false,
		allowedFileTypes: "*",
	});
	return paths[0] ?? null;
}

export async function loadSampleFlowJson() {
	const path = resolve(
		defaultWorkspaceRoot,
		"flows/login-and-profile.flow.json",
	);
	return JSON.parse(await readFile(path, "utf8"));
}

export async function listCollectionRequests(
	workspace: string,
): Promise<RequestMeta[]> {
	const root = resolve(workspace);
	const ws = await loadWorkspace(root);
	return listRequests(root, ws.manifest);
}

export async function loadRequest(
	workspace: string,
	requestPath: string,
): Promise<RequestV1> {
	const root = resolve(workspace);
	const ws = await loadWorkspace(root);
	return loadRequestFile(root, ws.manifest, requestPath);
}

export async function saveRequest(
	workspace: string,
	requestPath: string,
	request: RequestV1,
): Promise<RequestV1> {
	const validated = validateRequest(request);
	if (!validated.success) throw new Error(validated.error);
	const root = resolve(workspace);
	const ws = await loadWorkspace(root);
	await ensureCollectionsDir(root, ws.manifest);
	return saveRequestFile(root, ws.manifest, requestPath, validated.data);
}

export async function createRequest(
	workspace: string,
	requestPath: string,
	name?: string,
): Promise<RequestV1> {
	const root = resolve(workspace);
	const ws = await loadWorkspace(root);
	await ensureCollectionsDir(root, ws.manifest);
	const existing = await listRequests(root, ws.manifest);
	if (existing.some((r) => r.path === requestPath)) {
		throw new Error(`Request already exists: ${requestPath}`);
	}
	const id = requestPath.includes("/")
		? (requestPath.split("/").pop() ?? requestPath)
		: requestPath;
	const request: RequestV1 = {
		version: REQUEST_VERSION,
		id,
		name: name ?? id,
		method: "GET",
		url: "https://dummyjson.com/test",
		headers: {},
	};
	return saveRequestFile(root, ws.manifest, requestPath, request);
}

export async function deleteRequest(
	workspace: string,
	requestPath: string,
): Promise<void> {
	const root = resolve(workspace);
	const ws = await loadWorkspace(root);
	await deleteRequestFile(root, ws.manifest, requestPath);
}

export async function createCollection(
	workspace: string,
	collectionName: string,
): Promise<{ ok: true }> {
	const root = resolve(workspace);
	const ws = await loadWorkspace(root);
	const normalized = collectionName
		.replace(/\\/g, "/")
		.replace(/^\/+|\/+$/g, "");
	if (!normalized || normalized.includes("..")) {
		throw new Error(`Invalid collection name: ${collectionName}`);
	}
	await mkdir(join(root, ws.manifest.collectionsDir, normalized), {
		recursive: true,
	});
	return { ok: true };
}

/** Run a standalone collection request via an ephemeral single-HTTP flow. */
export async function executeRequestRpc(
	requestPath: string,
	options?: { env?: string; workspace?: string },
): Promise<ExecuteRequestRpcResult> {
	const root = options?.workspace
		? resolve(options.workspace)
		: defaultWorkspaceRoot;
	const ws = await loadWorkspace(root);
	const request = await loadRequestFile(root, ws.manifest, requestPath);
	const envName = options?.env ?? "local";
	const envVars = ws.environments[envName]?.variables ?? {};
	const secrets = await loadSecrets(root, envName, ws.manifest.environmentsDir);

	const flow: FlowV1 = {
		id: `_request-${request.id}`,
		version: FLOW_VERSION,
		name: request.name,
		nodes: [
			{ id: "input", type: "input", data: { label: "Input" } },
			{
				id: "http",
				type: "http",
				data: {
					label: request.name,
					method: request.method,
					url: request.url,
					headers: request.headers,
					...(request.body !== undefined ? { body: request.body } : {}),
				},
			},
			{ id: "output", type: "output", data: { label: "Output" } },
		],
		edges: [
			{ id: "e-in-http", source: "input", target: "http", sourceHandle: null },
			{
				id: "e-http-out",
				source: "http",
				target: "output",
				sourceHandle: null,
			},
		],
	};

	const validated = validateFlow(flow);
	if (!validated.success) throw new Error(validated.error);

	const logs: ExecutionLogEntry[] = [];
	const pushLog = (
		level: ExecutionLogEntry["level"],
		message: string,
		extra?: Omit<ExecutionLogEntry, "ts" | "level" | "message">,
	) => {
		logs.push({ ts: Date.now(), level, message, ...extra });
	};

	const events = new EngineEventEmitter();
	events.on("node:before", ({ nodeId, type }) => {
		pushLog("info", `→ ${type} (${nodeId})`, {
			nodeId,
			nodeType: type,
			phase: "before",
		});
	});
	events.on("node:after", ({ nodeId, type, input, output }) => {
		pushLog("info", `✓ ${type} (${nodeId})`, {
			nodeId,
			nodeType: type,
			phase: "after",
			data: { input, output },
		});
	});
	events.on("node:error", ({ nodeId, type, input, error }) => {
		const { message, detail } = serializeError(error);
		const data: Record<string, unknown> = { input, error: detail };
		if (
			error &&
			typeof error === "object" &&
			"request" in error &&
			(error as { name?: string }).name === "HttpNodeError"
		) {
			data.request = (error as { request: unknown }).request;
		}
		pushLog("error", `✗ ${type} (${nodeId}): ${message}`, {
			nodeId,
			nodeType: type,
			phase: "error",
			data,
		});
		if (isTlsCertificateError(error)) {
			pushLog("error", TLS_INSECURE_HINT, {
				nodeId,
				nodeType: type,
				phase: "error",
			});
		}
	});

	pushLog("info", `Request started · env=${envName}`, { phase: "start" });

	try {
		const result = await executeFlow(validated.data, {
			input: {},
			env: envVars,
			secrets,
			events,
			fetch: createExecutionFetch(),
		});
		const httpOutput = result.nodeOutputs.http ?? null;
		return { ...result, httpOutput, logs };
	} catch (error) {
		const msg = formatErrorForConsole(error);
		pushLog("error", msg);
		if (error instanceof FlowExecutionError) {
			return {
				...error.partial,
				httpOutput: error.partial.nodeOutputs.http ?? null,
				logs,
				error: error.message,
				failedNodeId: error.failedNodeId,
			};
		}
		throw error;
	}
}
