import type { ExecuteFlowResult } from "@quester/engine";
import type { FlowV1 } from "@quester/schema";
import type { RPCSchema } from "electrobun";

export type WorkspaceSummary = {
	name: string;
	root: string;
	envNames: string[];
	flowCount: number;
};

export type FlowMeta = { id: string; name: string };

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
				response: ExecuteFlowResult;
			};
		};
		messages: Record<string, never>;
	}>;
	webview: RPCSchema<{
		requests: Record<string, never>;
		messages: Record<string, never>;
	}>;
};
