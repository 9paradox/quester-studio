import { mock } from "bun:test";
import type {
	EnvironmentV1,
	FlowV1,
	WorkspaceV1,
} from "@quester-studio/schema";

export const SMOKE_WORKSPACE = "/smoke/workspace";

export const smokeManifest: WorkspaceV1 = {
	version: "v1",
	name: "Smoke Workspace",
	description: "Renderer smoke fixture",
	flowsDir: "flows",
	environmentsDir: "environments",
	collectionsDir: "collections",
	settings: {
		http: {
			defaultHeaders: {},
			timeoutMs: 30_000,
		},
	},
};

export const smokeFlow: FlowV1 = {
	version: "v1",
	id: "smoke-flow",
	name: "Smoke Flow",
	nodes: [
		{
			id: "start",
			type: "start",
			position: { x: 0, y: 0 },
			data: {},
		},
		{
			id: "out",
			type: "output",
			position: { x: 220, y: 0 },
			data: { value: "{{nodes.start}}" },
		},
	],
	edges: [{ id: "e1", source: "start", target: "out" }],
};

export const smokeEnvironment: EnvironmentV1 = {
	version: "v1",
	name: "local",
	variables: { API_BASE: "https://example.com" },
};

const rpc = {
	getDefaultWorkspace: async () => SMOKE_WORKSPACE,
	pickWorkspaceFolder: async () => null,
	pickCollectionFile: async () => null,
	scaffoldWorkspace: async (path: string, name?: string) => ({
		root: path,
		name: name ?? "scaffolded",
		flowId: "hello",
	}),
	openWorkspaceSummary: async () => ({
		name: smokeManifest.name,
		root: SMOKE_WORKSPACE,
		envNames: ["local"],
		flowCount: 1,
		manifest: smokeManifest,
	}),
	loadWorkspaceManifest: async () => smokeManifest,
	saveWorkspaceManifest: async (_workspace: string, manifest: WorkspaceV1) =>
		manifest,
	listFlows: async () => [{ id: smokeFlow.id, name: smokeFlow.name }],
	listEnvs: async () => ["local"],
	listSecretFiles: async () => [],
	listCollectionRequests: async () => [],
	listCollections: async () => [],
	loadFlow: async () => smokeFlow,
	loadEnvironment: async () => smokeEnvironment,
	listSecretNames: async () => [],
	readPathShapes: async () => null,
	writePathShapes: async () => ({ ok: true }),
	setAppTlsVerify: async () => ({ ok: true, verifyTls: true }),
	getAppTlsVerify: async () => ({ verifyTls: true }),
	setNativeChromeTheme: async () => ({
		ok: true as const,
		dark: true,
		theme: "system" as const,
	}),
	executeFlowRpc: async () => ({
		output: {},
		nodeOutputs: {},
		nodeInputs: {},
		steps: [],
		vars: {},
		logs: [],
	}),
	cancelFlowRun: async () => ({ ok: false }),
	saveFlow: async (flow: FlowV1) => flow,
	createFlow: async () => smokeFlow,
	deleteFlow: async () => ({ ok: true }),
	renameFlow: async () => smokeFlow,
	saveEnvironment: async (env: EnvironmentV1) => env,
	createEnvironment: async () => smokeEnvironment,
	loadSecretsFile: async () => ({ version: "v1" as const, secrets: {} }),
	saveSecretsFile: async (
		_w: string,
		_e: string,
		secrets: { version: "v1"; secrets: Record<string, string> },
	) => secrets,
	createSecretsFile: async () => ({
		version: "v1" as const,
		secrets: {},
	}),
	loadRequest: async () => ({
		version: "v1" as const,
		id: "req",
		name: "Request",
		method: "GET" as const,
		url: "https://example.com",
	}),
	saveRequest: async (_w: string, _p: string, request: unknown) => request,
	createRequest: async () => ({
		version: "v1" as const,
		id: "req",
		name: "Request",
		method: "GET" as const,
		url: "https://example.com",
	}),
	deleteRequest: async () => ({ ok: true }),
	createCollection: async () => ({ ok: true }),
	importCollection: async () => ({ imported: [], skipped: [] }),
	executeRequestRpc: async () => ({
		output: {},
		nodeOutputs: {},
		nodeInputs: {},
		steps: [],
		vars: {},
		logs: [],
		httpOutput: null,
	}),
	onNodeRunStatus: () => () => {},
};

/** Call before importing AppShell / quester-store in smoke tests. */
export function mockDesktopRpc() {
	mock.module("@/lib/quester-client.js", () => ({
		getQuesterClient: () => rpc,
		setQuesterClient: () => {},
		resetQuesterClientForTests: () => {},
	}));
	mock.module("@/lib/electrobun.js", () => ({
		desktopRpc: rpc,
		onNodeRunStatus: () => () => {},
	}));
}
