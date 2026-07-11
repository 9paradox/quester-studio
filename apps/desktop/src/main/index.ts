import { BrowserView, BrowserWindow } from "electrobun/bun";
import type { DesktopRPC } from "../shared/rpc.js";

async function getMainViewUrl(): Promise<string> {
	try {
		const response = await fetch("http://localhost:5173", {
			signal: AbortSignal.timeout(500),
		});
		if (response.ok) return "http://localhost:5173";
	} catch {
		// Vite dev server not running — use bundled views
	}
	return "views://mainview/index.html";
}

const rpc = BrowserView.defineRPC<DesktopRPC>({
	maxRequestTime: 30_000,
	handlers: {
		requests: {
			getDefaultWorkspace: async () =>
				(await import("./handlers.js")).getDefaultWorkspace(),
			pickWorkspaceFolder: async () =>
				(await import("./handlers.js")).pickWorkspaceFolder(),
			openWorkspaceSummary: async ({ path }) =>
				(await import("./handlers.js")).openWorkspaceSummary(path),
			listFlows: async ({ workspace }) =>
				(await import("./handlers.js")).listFlows(workspace),
			listEnvs: async ({ workspace }) =>
				(await import("./handlers.js")).listEnvs(workspace),
			loadFlow: async ({ flowId, workspace }) =>
				(await import("./handlers.js")).loadFlow(flowId, workspace),
			executeFlowRpc: async ({ flowId, workspace, env, input }) =>
				(await import("./handlers.js")).executeFlowRpc(flowId, {
					workspace,
					env,
					input,
				}),
		},
		messages: {},
	},
});

const mainWindow = new BrowserWindow({
	title: "Quester",
	url: await getMainViewUrl(),
	frame: {
		width: 1200,
		height: 800,
		x: 100,
		y: 100,
	},
	rpc,
	activate: true,
});

mainWindow.on("close", () => {
	process.exit(0);
});

mainWindow.webview.on("dom-ready", () => {
	console.log("Quester webview ready");
});

console.log("Quester desktop started");
