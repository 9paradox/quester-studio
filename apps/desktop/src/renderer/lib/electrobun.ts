import type { EnvironmentV1, FlowV1, SecretsV1 } from "@quester/schema";
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
};
