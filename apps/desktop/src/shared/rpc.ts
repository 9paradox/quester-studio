import type { ExecuteFlowResult } from "@quester/engine";
import type { EnvironmentV1, FlowV1, SecretsV1 } from "@quester/schema";
import type { RPCSchema } from "electrobun";

export type WorkspaceSummary = {
	name: string;
	root: string;
	envNames: string[];
	flowCount: number;
};

export type FlowMeta = { id: string; name: string };

export type SecretFileMeta = { envName: string; fileName: string };

export type ExecutionLogEntry = {
	ts: number;
	level: "info" | "error";
	message: string;
};

export type ExecuteFlowRpcResult = ExecuteFlowResult & {
	logs: ExecutionLogEntry[];
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
		};
		messages: Record<string, never>;
	}>;
	webview: RPCSchema<{
		requests: Record<string, never>;
		messages: Record<string, never>;
	}>;
};
