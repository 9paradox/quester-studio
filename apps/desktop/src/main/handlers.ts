import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { executeFlow, loadSecrets, loadWorkspace } from "@quester/engine";
import type { FlowV1 } from "@quester/schema";
import { validateFlow } from "@quester/schema";

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
	return executeFlow(validated.data, {
		input: options?.input ?? {},
		env: envVars,
		secrets,
	});
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
