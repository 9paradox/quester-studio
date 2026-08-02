import type { ExecuteFlowResult } from "@quester-studio/engine";
import type {
	EnvironmentV1,
	FlowV1,
	RequestV1,
	SecretsV1,
	WorkspaceV1,
} from "@quester-studio/schema";

export type WorkspaceSummary = {
	name: string;
	root: string;
	envNames: string[];
	flowCount: number;
	manifest?: WorkspaceV1;
};

export type FlowMeta = { id: string; name: string };

export type RequestMeta = {
	path: string;
	id: string;
	name: string;
	collection: string;
};

export type SecretFileMeta = { envName: string; fileName: string };

export type ExecutionLogEntry = {
	ts: number;
	level: "info" | "error";
	message: string;
	nodeId?: string;
	nodeType?: string;
	phase?: "before" | "after" | "error" | "complete" | "start";
	data?: unknown;
};

/** Runtime status shown on canvas nodes for the latest / active run. */
export type NodeRunStatus =
	| "idle"
	| "running"
	| "success"
	| "error"
	| "skipped";

/** Live lifecycle update during executeFlow. */
export type NodeRunStatusEvent = {
	runId: string;
	flowId: string;
	nodeId: string;
	nodeType: string;
	status: Extract<NodeRunStatus, "running" | "success" | "error">;
	ts: number;
};

export type ExecuteFlowRpcResult = ExecuteFlowResult & {
	logs: ExecutionLogEntry[];
	error?: string;
	failedNodeId?: string;
	cancelled?: boolean;
};

export type ExecuteRequestRpcResult = ExecuteFlowResult & {
	httpOutput: unknown;
	logs: ExecutionLogEntry[];
	error?: string;
	failedNodeId?: string;
};

/** Shared workspace/run API (desktop RPC + HTTP). Desktop-only chrome omitted. */
export type QuesterApiMethods = {
	getDefaultWorkspace: () => Promise<string>;
	/** Desktop: native folder picker. HTTP/API: typically returns null. */
	pickWorkspaceFolder: () => Promise<string | null>;
	/** Desktop: JSON file picker for Postman collections. HTTP/API: typically returns null. */
	pickCollectionFile: () => Promise<string | null>;
	scaffoldWorkspace: (
		path: string,
		name?: string,
	) => Promise<{ root: string; name: string; flowId: string }>;
	openWorkspaceSummary: (path: string) => Promise<WorkspaceSummary>;
	loadWorkspaceManifest: (workspace: string) => Promise<WorkspaceV1>;
	saveWorkspaceManifest: (
		workspace: string,
		manifest: WorkspaceV1,
	) => Promise<WorkspaceV1>;
	listFlows: (workspace: string) => Promise<FlowMeta[]>;
	listEnvs: (workspace: string) => Promise<string[]>;
	loadFlow: (flowId: string, workspace: string) => Promise<FlowV1>;
	executeFlowRpc: (params: {
		flowId: string;
		workspace: string;
		runId: string;
		env?: string;
		input?: unknown;
	}) => Promise<ExecuteFlowRpcResult>;
	cancelFlowRun: (params: { runId: string }) => Promise<{ ok: boolean }>;
	saveFlow: (flow: FlowV1, workspace: string) => Promise<FlowV1>;
	listSecretNames: (workspace: string, env: string) => Promise<string[]>;
	createFlow: (
		workspace: string,
		flowId: string,
		name?: string,
	) => Promise<FlowV1>;
	deleteFlow: (workspace: string, flowId: string) => Promise<{ ok: true }>;
	renameFlow: (
		workspace: string,
		flowId: string,
		newId: string,
		name?: string,
	) => Promise<FlowV1>;
	loadEnvironment: (
		workspace: string,
		envName: string,
	) => Promise<EnvironmentV1>;
	saveEnvironment: (
		workspace: string,
		environment: EnvironmentV1,
	) => Promise<EnvironmentV1>;
	createEnvironment: (
		workspace: string,
		envName: string,
	) => Promise<EnvironmentV1>;
	listSecretFiles: (workspace: string) => Promise<SecretFileMeta[]>;
	loadSecretsFile: (workspace: string, envName: string) => Promise<SecretsV1>;
	saveSecretsFile: (
		workspace: string,
		envName: string,
		secrets: SecretsV1,
	) => Promise<SecretsV1>;
	createSecretsFile: (workspace: string, envName: string) => Promise<SecretsV1>;
	listCollectionRequests: (workspace: string) => Promise<RequestMeta[]>;
	listCollections: (workspace: string) => Promise<string[]>;
	loadRequest: (workspace: string, requestPath: string) => Promise<RequestV1>;
	saveRequest: (
		workspace: string,
		requestPath: string,
		request: RequestV1,
	) => Promise<RequestV1>;
	createRequest: (
		workspace: string,
		requestPath: string,
		name?: string,
	) => Promise<RequestV1>;
	deleteRequest: (
		workspace: string,
		requestPath: string,
	) => Promise<{ ok: true }>;
	createCollection: (
		workspace: string,
		collectionName: string,
	) => Promise<{ ok: true }>;
	importCollection: (
		workspace: string,
		filePath: string,
	) => Promise<{ imported: string[]; skipped: string[] }>;
	executeRequestRpc: (params: {
		requestPath: string;
		workspace: string;
		env?: string;
	}) => Promise<ExecuteRequestRpcResult>;
	readPathShapes: (workspace: string) => Promise<unknown>;
	writePathShapes: (workspace: string, data: unknown) => Promise<{ ok: true }>;
	setAppTlsVerify: (
		verifyTls: boolean,
	) => Promise<{ ok: true; verifyTls: boolean }>;
	getAppTlsVerify: () => Promise<{ verifyTls: boolean }>;
	/** Desktop: reveal a path in the OS file manager. HTTP/API may return ok: false. */
	openPathInOs: (path: string) => Promise<{ ok: boolean; error?: string }>;
};

export type QuesterClient = QuesterApiMethods & {
	onNodeRunStatus: (
		listener: (event: NodeRunStatusEvent) => void,
	) => () => void;
};
