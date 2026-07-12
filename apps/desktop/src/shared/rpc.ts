import type { ExecuteFlowResult } from "@quester/engine";
import type {
	EnvironmentV1,
	FlowV1,
	RequestV1,
	SecretsV1,
} from "@quester/schema";
import type { RPCSchema } from "electrobun";

export type WorkspaceSummary = {
	name: string;
	root: string;
	envNames: string[];
	flowCount: number;
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

export type ExecuteFlowRpcResult = ExecuteFlowResult & {
	logs: ExecutionLogEntry[];
	error?: string;
	failedNodeId?: string;
};

export type ExecuteRequestRpcResult = ExecuteFlowResult & {
	httpOutput: unknown;
	logs: ExecutionLogEntry[];
	error?: string;
	failedNodeId?: string;
};

export type DesktopRPC = {
	bun: RPCSchema<{
		requests: {
			getDefaultWorkspace: {
				params: Record<string, never>;
				response: string;
			};
			pickWorkspaceFolder: {
				params: Record<string, never>;
				response: string | null;
			};
			openWorkspaceSummary: {
				params: { path: string };
				response: WorkspaceSummary;
			};
			listFlows: {
				params: { workspace: string };
				response: FlowMeta[];
			};
			listEnvs: {
				params: { workspace: string };
				response: string[];
			};
			loadFlow: {
				params: { flowId: string; workspace: string };
				response: FlowV1;
			};
			executeFlowRpc: {
				params: {
					flowId: string;
					workspace: string;
					env?: string;
					input?: unknown;
				};
				response: ExecuteFlowRpcResult;
			};
			saveFlow: {
				params: { flow: FlowV1; workspace: string };
				response: FlowV1;
			};
			listSecretNames: {
				params: { workspace: string; env: string };
				response: string[];
			};
			createFlow: {
				params: { workspace: string; flowId: string; name?: string };
				response: FlowV1;
			};
			deleteFlow: {
				params: { workspace: string; flowId: string };
				response: { ok: true };
			};
			renameFlow: {
				params: {
					workspace: string;
					flowId: string;
					newId: string;
					name?: string;
				};
				response: FlowV1;
			};
			loadEnvironment: {
				params: { workspace: string; envName: string };
				response: EnvironmentV1;
			};
			saveEnvironment: {
				params: { workspace: string; environment: EnvironmentV1 };
				response: EnvironmentV1;
			};
			createEnvironment: {
				params: { workspace: string; envName: string };
				response: EnvironmentV1;
			};
			listSecretFiles: {
				params: { workspace: string };
				response: SecretFileMeta[];
			};
			loadSecretsFile: {
				params: { workspace: string; envName: string };
				response: SecretsV1;
			};
			saveSecretsFile: {
				params: {
					workspace: string;
					envName: string;
					secrets: SecretsV1;
				};
				response: SecretsV1;
			};
			createSecretsFile: {
				params: { workspace: string; envName: string };
				response: SecretsV1;
			};
			listCollectionRequests: {
				params: { workspace: string };
				response: RequestMeta[];
			};
			listCollections: {
				params: { workspace: string };
				response: string[];
			};
			loadRequest: {
				params: { workspace: string; requestPath: string };
				response: RequestV1;
			};
			saveRequest: {
				params: {
					workspace: string;
					requestPath: string;
					request: RequestV1;
				};
				response: RequestV1;
			};
			createRequest: {
				params: {
					workspace: string;
					requestPath: string;
					name?: string;
				};
				response: RequestV1;
			};
			deleteRequest: {
				params: { workspace: string; requestPath: string };
				response: { ok: true };
			};
			createCollection: {
				params: { workspace: string; collectionName: string };
				response: { ok: true };
			};
			executeRequestRpc: {
				params: {
					requestPath: string;
					workspace: string;
					env?: string;
				};
				response: ExecuteRequestRpcResult;
			};
		};
		messages: Record<string, never>;
	}>;
	webview: RPCSchema<{
		requests: Record<string, never>;
		messages: Record<string, never>;
	}>;
};
