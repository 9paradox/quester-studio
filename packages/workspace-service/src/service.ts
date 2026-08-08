import { existsSync } from "node:fs";
import {
	cp,
	mkdir,
	readFile,
	readdir,
	unlink,
	writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
	ExecuteRequestRpcResult,
	ExecutionLogEntry,
	NodeRunStatusEvent,
	RequestMeta,
	SecretFileMeta,
} from "@quester-studio/api-contract";
import {
	EngineEventEmitter,
	FlowCancelledError,
	FlowExecutionError,
	RunFileLogger,
	collectSecretValues,
	createExecuteSubflow,
	createHttpFetch,
	createRunDirName,
	deleteRequest as deleteRequestFile,
	ensureCollectionsDir,
	executeFlow,
	importPostmanCollectionFile,
	listCollectionFolders,
	listRequests,
	loadRequest as loadRequestFile,
	loadSecrets,
	loadWorkspace,
	redactForRunLog,
	resolveTlsVerifyActive,
	saveRequest as saveRequestFile,
} from "@quester-studio/engine";
import { CookieJar } from "@quester-studio/engine";
import type {
	EnvironmentV1,
	FlowV1,
	HttpSettingsV1,
	RequestV1,
	SecretsV1,
} from "@quester-studio/schema";
import {
	ENVIRONMENT_VERSION,
	FLOW_VERSION,
	REQUEST_VERSION,
	SECRETS_VERSION,
	isCookieJarEnabled,
	isSafeWorkspaceFileId,
	mergeHttpSettings,
	secretsSchemaV1,
	validateEnvironment,
	validateFlow,
	validateRequest,
	validateWorkspace,
} from "@quester-studio/schema";
import type { WorkspaceV1 } from "@quester-studio/schema";
import {
	loadPersistedCookieJar,
	savePersistedCookieJar,
} from "./cookie-persistence.js";
import {
	formatErrorForConsole,
	isTlsCertificateError,
	serializeError,
	tlsCertificateHint,
} from "./errors.js";
import {
	cancelFlowRun,
	registerRunAbortController,
	unregisterRunAbortController,
} from "./run-cancellation.js";
import { getAppTlsVerify, setAppTlsVerify } from "./tlsRuntime.js";

export {
	cancelFlowRun,
	resetRunAbortControllersForTests,
} from "./run-cancellation.js";

export { getAppTlsVerify, setAppTlsVerify };

function assertSafeWorkspaceFileId(id: string, label: string): void {
	if (!isSafeWorkspaceFileId(id)) {
		throw new Error(`Invalid ${label}: ${id}`);
	}
}

function createRunFetch(
	workspaceRoot: string,
	httpDefaults: HttpSettingsV1,
	signal?: AbortSignal,
) {
	return createHttpFetch({
		httpDefaults,
		workspaceRoot,
		appVerifyTls: getAppTlsVerify(),
		signal,
	});
}

function tlsVerifyActiveForRun(httpDefaults: HttpSettingsV1): boolean {
	return resolveTlsVerifyActive({
		httpDefaults,
		appVerifyTls: getAppTlsVerify(),
	});
}

function pushTlsCertificateHint(
	pushLog: (
		level: ExecutionLogEntry["level"],
		message: string,
		extra?: Omit<ExecutionLogEntry, "ts" | "level" | "message">,
	) => void,
	nodeId: string,
	type: string,
	httpDefaults: HttpSettingsV1,
) {
	const hint = tlsCertificateHint({
		verifyEnabled: tlsVerifyActiveForRun(httpDefaults),
	});
	if (!hint) return;
	pushLog("error", hint, {
		nodeId,
		nodeType: type,
		phase: "error",
	});
}

function hasQuesterManifest(dir: string): boolean {
	return existsSync(join(dir, "quester.json"));
}

/** Packaged Electrobun Resources/sample-workspace candidates. */
function packagedSampleCandidates(): string[] {
	const execDir = dirname(process.execPath);
	return [
		join(execDir, "Resources", "sample-workspace"),
		join(execDir, "..", "Resources", "sample-workspace"),
		join(process.cwd(), "Resources", "sample-workspace"),
		join(process.cwd(), "bundled", "sample-workspace"),
		join(process.cwd(), "apps", "desktop", "bundled", "sample-workspace"),
	];
}

/** Monorepo / source-tree sample (dev + tests). */
function resolveMonorepoSampleWorkspace(): string | null {
	const relative = join("examples", "sample-workspace");
	let dir = process.cwd();
	for (let i = 0; i < 12; i++) {
		const candidate = join(dir, relative);
		if (hasQuesterManifest(candidate)) return candidate;
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	const fromPackage = resolve(
		dirname(fileURLToPath(import.meta.url)),
		"../../../examples/sample-workspace",
	);
	return hasQuesterManifest(fromPackage) ? fromPackage : null;
}

/** Read-only sample source: packaged Resources, then monorepo examples. */
export function resolveSampleWorkspaceSource(
	env: NodeJS.ProcessEnv = process.env,
): string | null {
	const override = env.QUESTER_SAMPLE_SOURCE?.trim();
	if (override && hasQuesterManifest(override)) return resolve(override);
	for (const candidate of packagedSampleCandidates()) {
		if (hasQuesterManifest(candidate)) return candidate;
	}
	return resolveMonorepoSampleWorkspace();
}

function resolveDefaultWorkspaceRoot(): string {
	return (
		resolveSampleWorkspaceSource() ??
		resolve(
			dirname(fileURLToPath(import.meta.url)),
			"../../../examples/sample-workspace",
		)
	);
}

/** Writable copy target for Open sample (user may edit). */
export function resolveUserSampleWorkspaceRoot(
	env: NodeJS.ProcessEnv = process.env,
): string {
	const override = env.QUESTER_USER_SAMPLE_DIR?.trim();
	if (override) return resolve(override);
	if (process.platform === "win32") {
		const appData =
			env.APPDATA?.trim() || join(homedir(), "AppData", "Roaming");
		return join(appData, "Quester", "sample-workspace");
	}
	const xdg = env.XDG_DATA_HOME?.trim() || join(homedir(), ".local", "share");
	return join(xdg, "quester", "sample-workspace");
}

/**
 * Ensure a writable sample workspace exists (copy from packaged/monorepo source).
 * Reuses an existing user copy so edits are kept.
 */
export async function ensureUserSampleWorkspace(
	env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
	const dest = resolveUserSampleWorkspaceRoot(env);
	if (hasQuesterManifest(dest)) return dest;

	const source = resolveSampleWorkspaceSource(env);
	if (!source) {
		throw new Error(
			"Sample workspace not found. Reinstall the app or open a workspace folder.",
		);
	}
	await mkdir(dirname(dest), { recursive: true });
	await cp(source, dest, { recursive: true, force: true });
	if (!hasQuesterManifest(dest)) {
		throw new Error(`Failed to copy sample workspace to ${dest}`);
	}
	return dest;
}

/** Override default workspace (e.g. QUESTER_WORKSPACE_ROOT for apps/api). */
export function resolveConfiguredWorkspaceRoot(
	env: NodeJS.ProcessEnv = process.env,
): string {
	const configured = env.QUESTER_WORKSPACE_ROOT?.trim();
	if (configured) return resolve(configured);
	return defaultWorkspaceRoot;
}

export const defaultWorkspaceRoot = resolveDefaultWorkspaceRoot();

export async function getDefaultWorkspace(): Promise<string> {
	const configured = process.env.QUESTER_WORKSPACE_ROOT?.trim();
	if (configured) return resolve(configured);
	return ensureUserSampleWorkspace();
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
		manifest: ws.manifest,
	};
}

export async function loadWorkspaceManifest(
	workspace: string,
): Promise<WorkspaceV1> {
	const ws = await openWorkspace(workspace);
	return ws.manifest;
}

export async function saveWorkspaceManifest(
	workspace: string,
	manifest: WorkspaceV1,
): Promise<WorkspaceV1> {
	const validated = validateWorkspace(manifest);
	if (!validated.success) throw new Error(validated.error);
	const root = resolve(workspace);
	const filePath = join(root, "quester.json");
	await writeFile(
		filePath,
		`${JSON.stringify(validated.data, null, "\t")}\n`,
		"utf8",
	);
	return validated.data;
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

export type ExecuteFlowRpcOptions = {
	env?: string;
	input?: unknown;
	workspace?: string;
	runId?: string;
	signal?: AbortSignal;
	onNodeStatus?: (
		event: Omit<NodeRunStatusEvent, "runId" | "flowId"> & {
			runId?: string;
			flowId?: string;
		},
	) => void;
};

export async function executeFlowRpc(
	flowId: string,
	options?: ExecuteFlowRpcOptions,
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
	const httpDefaults = mergeHttpSettings(
		ws.manifest.settings?.http,
		validated.data.settings?.http,
	);

	const logs: ExecutionLogEntry[] = [];
	const secretValues = collectSecretValues(secrets);
	const pushLog = (
		level: ExecutionLogEntry["level"],
		message: string,
		extra?: Omit<ExecutionLogEntry, "ts" | "level" | "message">,
	) => {
		const data =
			extra?.data !== undefined
				? redactForRunLog(extra.data, secretValues)
				: undefined;
		logs.push({
			ts: Date.now(),
			level,
			message: String(redactForRunLog(message, secretValues)),
			...extra,
			...(data !== undefined ? { data } : {}),
		});
	};
	const redactRpc = <T>(value: T): T =>
		redactForRunLog(value, secretValues) as T;

	const emitStatus = (
		status: Extract<
			NodeRunStatusEvent["status"],
			"running" | "success" | "error"
		>,
		nodeId: string,
		type: string,
	) => {
		options?.onNodeStatus?.({
			runId: options.runId,
			flowId,
			nodeId,
			nodeType: type,
			status,
			ts: Date.now(),
		});
	};

	const events = new EngineEventEmitter();
	events.on("node:before", ({ nodeId, type }) => {
		pushLog("info", `→ ${type} (${nodeId})`, {
			nodeId,
			nodeType: type,
			phase: "before",
		});
		emitStatus("running", nodeId, type);
	});
	events.on("node:after", ({ nodeId, type, input, output }) => {
		const logged =
			type === "log" &&
			output &&
			typeof output === "object" &&
			"logged" in output
				? String((output as { logged: unknown }).logged)
				: undefined;
		pushLog("info", logged ?? `✓ ${type} (${nodeId})`, {
			nodeId,
			nodeType: type,
			phase: "after",
			data: { input, output },
		});
		emitStatus("success", nodeId, type);
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
		emitStatus("error", nodeId, type);
		if (isTlsCertificateError(error)) {
			pushTlsCertificateHint(pushLog, nodeId, type, httpDefaults);
		}
	});
	events.on("flow:complete", ({ output }) => {
		pushLog("info", "Flow complete", {
			phase: "complete",
			data: { output },
		});
	});

	pushLog("info", `Run started · env=${envName}`, { phase: "start" });
	if (httpDefaults.timeoutMs !== undefined) {
		pushLog(
			"info",
			httpDefaults.timeoutMs === 0
				? "HTTP timeout: none"
				: `HTTP timeout: ${httpDefaults.timeoutMs}ms`,
			{ phase: "start" },
		);
	}
	if (!tlsVerifyActiveForRun(httpDefaults)) {
		pushLog(
			"info",
			"TLS verification disabled (workspace/flow settings, App Preferences, or QUESTR_INSECURE_TLS / NODE_TLS_REJECT_UNAUTHORIZED)",
			{
				phase: "start",
			},
		);
	}

	let runLogger: RunFileLogger | undefined;
	if (ws.manifest.runs?.enabled) {
		const runDir = join(
			root,
			ws.manifest.runs.dir ?? "runs",
			flowId,
			createRunDirName(),
		);
		await mkdir(runDir, { recursive: true });
		runLogger = new RunFileLogger({
			runDir,
			secretValues,
			meta: {
				flowId,
				flowName: validated.data.name,
				env: envName,
				startedAt: new Date().toISOString(),
				status: "running",
			},
		});
		await runLogger.init();
		pushLog("info", `Run file log: ${runDir}`, { phase: "start" });
	}

	try {
		const runSignal =
			options?.signal ??
			(options?.runId ? registerRunAbortController(options.runId) : undefined);
		const cookieJarEnabled = isCookieJarEnabled(httpDefaults);
		const cookieJar = cookieJarEnabled
			? ((await loadPersistedCookieJar(root)) ?? new CookieJar())
			: undefined;

		try {
			const executeSubflow = createExecuteSubflow(
				{ getFlow: (id) => ws.flows[id] },
				{
					env: envVars,
					secrets,
					events,
					signal: runSignal,
					fetch: createRunFetch(root, httpDefaults, runSignal),
					httpDefaults,
					cookieJar,
				},
				flowId,
			);
			const result = await executeFlow(validated.data, {
				input: options?.input ?? {},
				env: envVars,
				secrets,
				events,
				signal: runSignal,
				fetch: createRunFetch(root, httpDefaults, runSignal),
				httpDefaults,
				cookieJar,
				executeSubflow,
				runLogger,
			});
			return redactRpc({ ...result, logs });
		} finally {
			if (cookieJarEnabled && cookieJar) {
				await savePersistedCookieJar(root, cookieJar);
			}
			if (options?.runId && !options?.signal) {
				unregisterRunAbortController(options.runId);
			}
		}
	} catch (error) {
		const msg = formatErrorForConsole(error);
		if (error instanceof FlowCancelledError) {
			pushLog("info", "Flow run cancelled", { phase: "complete" });
			return redactRpc({
				...error.partial,
				logs,
				cancelled: true,
				error: error.message,
			});
		}
		pushLog("error", msg);
		if (error instanceof FlowExecutionError) {
			return redactRpc({
				...error.partial,
				logs,
				error: error.message,
				failedNodeId: error.failedNodeId,
			});
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
	assertSafeWorkspaceFileId(validated.data.id, "flow id");

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
	assertSafeWorkspaceFileId(flowId, "flow id");
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
				id: "start",
				type: "start",
				data: { label: "Start" },
				position: { x: -40, y: 120 },
			},
			{
				id: "input",
				type: "input",
				data: { label: "Input" },
				position: { x: 180, y: 120 },
			},
		],
		edges: [
			{
				id: "e-start-input",
				source: "start",
				target: "input",
				sourceHandle: null,
			},
		],
	};
	return saveFlow(flow, workspace);
}

export async function deleteFlow(
	flowId: string,
	workspace: string,
): Promise<void> {
	assertSafeWorkspaceFileId(flowId, "flow id");
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
	assertSafeWorkspaceFileId(flowId, "flow id");
	assertSafeWorkspaceFileId(newId, "flow id");
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
	assertSafeWorkspaceFileId(validated.data.name, "environment name");

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
	assertSafeWorkspaceFileId(envName, "environment name");
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
	assertSafeWorkspaceFileId(envName, "environment name");
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
	assertSafeWorkspaceFileId(envName, "environment name");
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
	assertSafeWorkspaceFileId(envName, "environment name");
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

export async function scaffoldWorkspaceRpc(
	path: string,
	name?: string,
): Promise<{ root: string; name: string; flowId: string }> {
	const { scaffoldWorkspace } = await import("@quester-studio/engine");
	return scaffoldWorkspace(path, { name });
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

export async function listCollections(workspace: string): Promise<string[]> {
	const root = resolve(workspace);
	const ws = await loadWorkspace(root);
	return listCollectionFolders(root, ws.manifest);
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
		url: "https://example.com",
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
	await ensureCollectionsDir(root, ws.manifest);
	const normalized = collectionName
		.replace(/\\/g, "/")
		.replace(/^\/+|\/+$/g, "");
	if (
		!normalized ||
		normalized.includes("..") ||
		normalized.split("/").some((p) => p === "")
	) {
		throw new Error(`Invalid collection name: ${collectionName}`);
	}
	const dir = join(root, ws.manifest.collectionsDir, normalized);
	await mkdir(dir, { recursive: true });
	// Keep empty folders visible to git and listCollectionFolders.
	const keep = join(dir, ".gitkeep");
	if (!existsSync(keep)) {
		await writeFile(keep, "", "utf8");
	}
	return { ok: true };
}

export async function importCollection(
	workspace: string,
	collectionFile: string,
): Promise<{ imported: string[]; skipped: string[] }> {
	const root = resolve(workspace);
	return importPostmanCollectionFile(root, collectionFile);
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
			{ id: "start", type: "start", data: { label: "Start" } },
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
			{
				id: "e-start-http",
				source: "start",
				target: "http",
				sourceHandle: null,
			},
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

	const httpDefaults = mergeHttpSettings(ws.manifest.settings?.http, undefined);

	const logs: ExecutionLogEntry[] = [];
	const secretValues = collectSecretValues(secrets);
	const pushLog = (
		level: ExecutionLogEntry["level"],
		message: string,
		extra?: Omit<ExecutionLogEntry, "ts" | "level" | "message">,
	) => {
		const data =
			extra?.data !== undefined
				? redactForRunLog(extra.data, secretValues)
				: undefined;
		logs.push({
			ts: Date.now(),
			level,
			message: String(redactForRunLog(message, secretValues)),
			...extra,
			...(data !== undefined ? { data } : {}),
		});
	};
	const redactRpc = <T>(value: T): T =>
		redactForRunLog(value, secretValues) as T;

	const events = new EngineEventEmitter();
	events.on("node:before", ({ nodeId, type }) => {
		pushLog("info", `→ ${type} (${nodeId})`, {
			nodeId,
			nodeType: type,
			phase: "before",
		});
	});
	events.on("node:after", ({ nodeId, type, input, output }) => {
		const logged =
			type === "log" &&
			output &&
			typeof output === "object" &&
			"logged" in output
				? String((output as { logged: unknown }).logged)
				: undefined;
		pushLog("info", logged ?? `✓ ${type} (${nodeId})`, {
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
			pushTlsCertificateHint(pushLog, nodeId, type, httpDefaults);
		}
	});

	pushLog("info", `Request started · env=${envName}`, { phase: "start" });
	if (!tlsVerifyActiveForRun(httpDefaults)) {
		pushLog(
			"info",
			"TLS verification disabled (workspace/flow settings, App Preferences, or QUESTR_INSECURE_TLS / NODE_TLS_REJECT_UNAUTHORIZED)",
			{
				phase: "start",
			},
		);
	}

	try {
		const result = await executeFlow(validated.data, {
			input: {},
			env: envVars,
			secrets,
			events,
			fetch: createRunFetch(root, httpDefaults),
			httpDefaults,
		});
		const httpOutput = result.nodeOutputs.http ?? null;
		return redactRpc({ ...result, httpOutput, logs });
	} catch (error) {
		const msg = formatErrorForConsole(error);
		pushLog("error", msg);
		if (error instanceof FlowExecutionError) {
			return redactRpc({
				...error.partial,
				httpOutput: error.partial.nodeOutputs.http ?? null,
				logs,
				error: error.message,
				failedNodeId: error.failedNodeId,
			});
		}
		throw error;
	}
}

const PATH_SHAPES_FILE = "path-shapes.json";

function pathShapesFilePath(workspace: string): string {
	const root = resolve(workspace);
	const dir = join(root, ".quester");
	const file = join(dir, PATH_SHAPES_FILE);
	const resolvedFile = resolve(file);
	if (!resolvedFile.startsWith(root)) {
		throw new Error("Invalid path shapes location");
	}
	return resolvedFile;
}

/** Read learned path-shape cache (paths only). Missing file → null. */
export async function readPathShapes(workspace: string): Promise<unknown> {
	const file = pathShapesFilePath(workspace);
	try {
		return JSON.parse(await readFile(file, "utf8")) as unknown;
	} catch {
		return null;
	}
}

/** Write learned path-shape cache under workspace/.quester/. */
export async function writePathShapes(
	workspace: string,
	data: unknown,
): Promise<{ ok: true }> {
	const file = pathShapesFilePath(workspace);
	await mkdir(dirname(file), { recursive: true });
	await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
	return { ok: true };
}
