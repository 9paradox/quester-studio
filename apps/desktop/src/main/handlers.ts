import { existsSync } from "node:fs";
import { readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	EngineEventEmitter,
	executeFlow,
	loadSecrets,
	loadWorkspace,
} from "@quester/engine";
import type { EnvironmentV1, FlowV1, SecretsV1 } from "@quester/schema";
import {
	ENVIRONMENT_VERSION,
	FLOW_VERSION,
	SECRETS_VERSION,
	secretsSchemaV1,
	validateEnvironment,
	validateFlow,
} from "@quester/schema";
import type { ExecutionLogEntry, SecretFileMeta } from "../shared/rpc.js";

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
	const pushLog = (level: ExecutionLogEntry["level"], message: string) => {
		logs.push({ ts: Date.now(), level, message });
	};

	const events = new EngineEventEmitter();
	events.on("node:before", ({ nodeId, type }) => {
		pushLog("info", `→ ${type} (${nodeId})`);
	});
	events.on("node:after", ({ nodeId, type }) => {
		pushLog("info", `✓ ${type} (${nodeId})`);
	});
	events.on("node:error", ({ nodeId, type, error }) => {
		const msg = error instanceof Error ? error.message : String(error);
		pushLog("error", `✗ ${type} (${nodeId}): ${msg}`);
	});
	events.on("flow:complete", () => {
		pushLog("info", "Flow complete");
	});

	pushLog("info", `Run started · env=${envName}`);

	try {
		const result = await executeFlow(validated.data, {
			input: options?.input ?? {},
			env: envVars,
			secrets,
			events,
		});
		return { ...result, logs };
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		pushLog("error", msg);
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
