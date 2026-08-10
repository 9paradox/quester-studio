import type {
	EnvironmentV1,
	FlowV1,
	RequestV1,
	SecretsV1,
	WorkspaceV1,
} from "@quester-studio/schema";
import { Electroview } from "electrobun/view";
import type { ThemePreference } from "../../shared/appPreferences.js";
import type { DesktopRPC, NodeRunStatusEvent } from "../../shared/rpc.js";

type NodeRunStatusListener = (event: NodeRunStatusEvent) => void;
type FlowFileChangedListener = (event: {
	workspace: string;
	flowId: string;
	filename: string;
	kind: "change" | "rename";
}) => void;
type McpServerStatusListener = (event: {
	running: boolean;
	workspace: string | null;
	pid: number | null;
	error: string | null;
}) => void;
type McpActivityListener = (event: {
	ts: string;
	tool: string;
	ok: boolean;
	summary: string;
	flowId?: string;
	nodeId?: string;
	durationMs?: number;
	error?: string;
}) => void;

const nodeRunStatusListeners = new Set<NodeRunStatusListener>();
const flowFileChangedListeners = new Set<FlowFileChangedListener>();
const mcpServerStatusListeners = new Set<McpServerStatusListener>();
const mcpActivityListeners = new Set<McpActivityListener>();

const rpc = Electroview.defineRPC<DesktopRPC>({
	/** Keep in sync with main process (B5). */
	maxRequestTime: 3_600_000,
	handlers: {
		requests: {},
		messages: {
			nodeRunStatus: (event) => {
				for (const listener of nodeRunStatusListeners) {
					listener(event);
				}
			},
			flowFileChanged: (event) => {
				for (const listener of flowFileChangedListeners) {
					listener(event);
				}
			},
			mcpServerStatus: (event) => {
				for (const listener of mcpServerStatusListeners) {
					listener(event);
				}
			},
			mcpActivity: (event) => {
				for (const listener of mcpActivityListeners) {
					listener(event);
				}
			},
		},
	},
});

const electrobun = new Electroview({ rpc });

function getRpc() {
	if (!electrobun.rpc) {
		throw new Error("Electrobun RPC is not initialized");
	}
	return electrobun.rpc;
}

export function onNodeRunStatus(listener: NodeRunStatusListener): () => void {
	nodeRunStatusListeners.add(listener);
	return () => {
		nodeRunStatusListeners.delete(listener);
	};
}

export function onFlowFileChanged(
	listener: FlowFileChangedListener,
): () => void {
	flowFileChangedListeners.add(listener);
	return () => {
		flowFileChangedListeners.delete(listener);
	};
}

export function onMcpServerStatus(
	listener: McpServerStatusListener,
): () => void {
	mcpServerStatusListeners.add(listener);
	return () => {
		mcpServerStatusListeners.delete(listener);
	};
}

export function onMcpActivity(listener: McpActivityListener): () => void {
	mcpActivityListeners.add(listener);
	return () => {
		mcpActivityListeners.delete(listener);
	};
}

/**
 * Wire MCP/activity messages into the store as soon as this module loads so
 * events are not dropped while useAppInit’s effect is still importing.
 */
void import("@/stores/quester-store.js").then(({ useQuesterStore }) => {
	onMcpActivity((event) => {
		useQuesterStore.getState().handleMcpActivity(event);
	});
	onMcpServerStatus((status) => {
		useQuesterStore.getState().applyMcpServerStatus(status);
	});
});

export const desktopRpc = {
	getDefaultWorkspace: () => getRpc().request.getDefaultWorkspace({}),
	pickWorkspaceFolder: () => getRpc().request.pickWorkspaceFolder({}),
	pickCollectionFile: () => getRpc().request.pickCollectionFile({}),
	scaffoldWorkspace: (path: string, name?: string) =>
		getRpc().request.scaffoldWorkspace({ path, name }),
	openWorkspaceSummary: (path: string) =>
		getRpc().request.openWorkspaceSummary({ path }),
	loadWorkspaceManifest: (workspace: string) =>
		getRpc().request.loadWorkspaceManifest({ workspace }),
	saveWorkspaceManifest: (workspace: string, manifest: WorkspaceV1) =>
		getRpc().request.saveWorkspaceManifest({ workspace, manifest }),
	listFlows: (workspace: string) => getRpc().request.listFlows({ workspace }),
	listEnvs: (workspace: string) => getRpc().request.listEnvs({ workspace }),
	loadFlow: (flowId: string, workspace: string) =>
		getRpc().request.loadFlow({ flowId, workspace }),
	executeFlowRpc: (params: {
		flowId: string;
		workspace: string;
		runId: string;
		env?: string;
		input?: unknown;
	}) => getRpc().request.executeFlowRpc(params),
	cancelFlowRun: (params: { runId: string }) =>
		getRpc().request.cancelFlowRun(params),
	saveFlow: (flow: FlowV1, workspace: string) =>
		getRpc().request.saveFlow({ flow, workspace }),
	listSecretNames: (workspace: string, env: string) =>
		getRpc().request.listSecretNames({ workspace, env }),
	createFlow: (workspace: string, flowId: string, name?: string) =>
		getRpc().request.createFlow({ workspace, flowId, name }),
	deleteFlow: (workspace: string, flowId: string) =>
		getRpc().request.deleteFlow({ workspace, flowId }),
	renameFlow: (
		workspace: string,
		flowId: string,
		newId: string,
		name?: string,
	) => getRpc().request.renameFlow({ workspace, flowId, newId, name }),
	loadEnvironment: (workspace: string, envName: string) =>
		getRpc().request.loadEnvironment({ workspace, envName }),
	saveEnvironment: (workspace: string, environment: EnvironmentV1) =>
		getRpc().request.saveEnvironment({ workspace, environment }),
	createEnvironment: (workspace: string, envName: string) =>
		getRpc().request.createEnvironment({ workspace, envName }),
	listSecretFiles: (workspace: string) =>
		getRpc().request.listSecretFiles({ workspace }),
	loadSecretsFile: (workspace: string, envName: string) =>
		getRpc().request.loadSecretsFile({ workspace, envName }),
	saveSecretsFile: (workspace: string, envName: string, secrets: SecretsV1) =>
		getRpc().request.saveSecretsFile({ workspace, envName, secrets }),
	createSecretsFile: (workspace: string, envName: string) =>
		getRpc().request.createSecretsFile({ workspace, envName }),
	listCollectionRequests: (workspace: string) =>
		getRpc().request.listCollectionRequests({ workspace }),
	listCollections: (workspace: string) =>
		getRpc().request.listCollections({ workspace }),
	loadRequest: (workspace: string, requestPath: string) =>
		getRpc().request.loadRequest({ workspace, requestPath }),
	saveRequest: (workspace: string, requestPath: string, request: RequestV1) =>
		getRpc().request.saveRequest({ workspace, requestPath, request }),
	createRequest: (workspace: string, requestPath: string, name?: string) =>
		getRpc().request.createRequest({ workspace, requestPath, name }),
	deleteRequest: (workspace: string, requestPath: string) =>
		getRpc().request.deleteRequest({ workspace, requestPath }),
	createCollection: (workspace: string, collectionName: string) =>
		getRpc().request.createCollection({ workspace, collectionName }),
	importCollection: (workspace: string, filePath: string) =>
		getRpc().request.importCollection({ workspace, filePath }),
	executeRequestRpc: (params: {
		requestPath: string;
		workspace: string;
		env?: string;
	}) => getRpc().request.executeRequestRpc(params),
	readPathShapes: (workspace: string) =>
		getRpc().request.readPathShapes({ workspace }),
	writePathShapes: (workspace: string, data: unknown) =>
		getRpc().request.writePathShapes({ workspace, data }),
	setAppTlsVerify: (verifyTls: boolean) =>
		getRpc().request.setAppTlsVerify({ verifyTls }),
	getAppTlsVerify: () => getRpc().request.getAppTlsVerify({}),
	openPathInOs: (path: string) => getRpc().request.openPathInOs({ path }),
	listRunTree: (workspace: string) =>
		getRpc().request.listRunTree({ workspace }),
	readRunJson: (workspace: string, relativePath: string) =>
		getRpc().request.readRunJson({ workspace, relativePath }),
	deleteRunPath: (workspace: string, relativePath: string) =>
		getRpc().request.deleteRunPath({ workspace, relativePath }),
	setNativeChromeTheme: (theme: ThemePreference) =>
		getRpc().request.setNativeChromeTheme({ theme }),
	getMcpConfigSnippet: (workspace: string) =>
		getRpc().request.getMcpConfigSnippet({ workspace }),
	watchFlows: (workspace: string) => getRpc().request.watchFlows({ workspace }),
	stopWatchFlows: (workspace?: string) =>
		getRpc().request.stopWatchFlows({ workspace }),
	watchMcpActivity: (workspace: string) =>
		getRpc().request.watchMcpActivity({ workspace }),
	stopWatchMcpActivity: (workspace?: string) =>
		getRpc().request.stopWatchMcpActivity({ workspace }),
	startMcpServer: (workspace: string) =>
		getRpc().request.startMcpServer({ workspace }),
	stopMcpServer: () => getRpc().request.stopMcpServer({}),
	getMcpServerStatus: () => getRpc().request.getMcpServerStatus({}),
};
