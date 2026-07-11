import { Electroview } from "electrobun/view";
import type { DesktopRPC } from "../../shared/rpc.js";

const rpc = Electroview.defineRPC<DesktopRPC>({
	maxRequestTime: 30_000,
	handlers: {
		requests: {},
		messages: {},
	},
});

const electrobun = new Electroview({ rpc });

function getRpc() {
	if (!electrobun.rpc) {
		throw new Error("Electrobun RPC is not initialized");
	}
	return electrobun.rpc;
}

export const desktopRpc = {
	getDefaultWorkspace: () => getRpc().request.getDefaultWorkspace({}),
	pickWorkspaceFolder: () => getRpc().request.pickWorkspaceFolder({}),
	openWorkspaceSummary: (path: string) =>
		getRpc().request.openWorkspaceSummary({ path }),
	listFlows: (workspace: string) => getRpc().request.listFlows({ workspace }),
	listEnvs: (workspace: string) => getRpc().request.listEnvs({ workspace }),
	loadFlow: (flowId: string, workspace: string) =>
		getRpc().request.loadFlow({ flowId, workspace }),
	executeFlowRpc: (params: {
		flowId: string;
		workspace: string;
		env?: string;
		input?: unknown;
	}) => getRpc().request.executeFlowRpc(params),
};
