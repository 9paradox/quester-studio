import { BrowserView, BrowserWindow } from "electrobun/bun";
import type { DesktopRPC } from "../shared/rpc.js";

const VITE_DEV_URL = "http://127.0.0.1:5173/";

async function getMainViewUrl(): Promise<string> {
	if (process.env.ELECTROBUN_HMR === "1") {
		try {
			const response = await fetch(VITE_DEV_URL, {
				signal: AbortSignal.timeout(2000),
			});
			const html = await response.text();
			if (
				response.ok &&
				html.includes('id="root"') &&
				html.includes("Quester")
			) {
				return VITE_DEV_URL;
			}
		} catch {
			// Vite dev server not ready — use bundled views
		}
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
			saveFlow: async ({ flow, workspace }) =>
				(await import("./handlers.js")).saveFlow(flow, workspace),
			listSecretNames: async ({ workspace, env }) =>
				(await import("./handlers.js")).listSecretNames(workspace, env),
			createFlow: async ({ workspace, flowId, name }) =>
				(await import("./handlers.js")).createFlow(workspace, flowId, name),
			deleteFlow: async ({ workspace, flowId }) => {
				await (await import("./handlers.js")).deleteFlow(flowId, workspace);
				return { ok: true as const };
			},
			renameFlow: async ({ workspace, flowId, newId, name }) =>
				(await import("./handlers.js")).renameFlow(
					workspace,
					flowId,
					newId,
					name,
				),
			loadEnvironment: async ({ workspace, envName }) =>
				(await import("./handlers.js")).loadEnvironment(workspace, envName),
			saveEnvironment: async ({ workspace, environment }) =>
				(await import("./handlers.js")).saveEnvironment(workspace, environment),
			createEnvironment: async ({ workspace, envName }) =>
				(await import("./handlers.js")).createEnvironment(workspace, envName),
			listSecretFiles: async ({ workspace }) =>
				(await import("./handlers.js")).listSecretFiles(workspace),
			loadSecretsFile: async ({ workspace, envName }) =>
				(await import("./handlers.js")).loadSecretsFile(workspace, envName),
			saveSecretsFile: async ({ workspace, envName, secrets }) =>
				(await import("./handlers.js")).saveSecretsFile(
					workspace,
					envName,
					secrets,
				),
			createSecretsFile: async ({ workspace, envName }) =>
				(await import("./handlers.js")).createSecretsFile(workspace, envName),
			listCollectionRequests: async ({ workspace }) =>
				(await import("./handlers.js")).listCollectionRequests(workspace),
			loadRequest: async ({ workspace, requestPath }) =>
				(await import("./handlers.js")).loadRequest(workspace, requestPath),
			saveRequest: async ({ workspace, requestPath, request }) =>
				(await import("./handlers.js")).saveRequest(
					workspace,
					requestPath,
					request,
				),
			createRequest: async ({ workspace, requestPath, name }) =>
				(await import("./handlers.js")).createRequest(
					workspace,
					requestPath,
					name,
				),
			deleteRequest: async ({ workspace, requestPath }) => {
				await (await import("./handlers.js")).deleteRequest(
					workspace,
					requestPath,
				);
				return { ok: true as const };
			},
			createCollection: async ({ workspace, collectionName }) =>
				(await import("./handlers.js")).createCollection(
					workspace,
					collectionName,
				),
			executeRequestRpc: async ({ requestPath, workspace, env }) =>
				(await import("./handlers.js")).executeRequestRpc(requestPath, {
					workspace,
					env,
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
	if (process.env.DEV === "1") {
		// Defer DevTools so WebView2 finishes the first paint (avoids blank window on Windows).
		setTimeout(() => mainWindow.webview.openDevTools(), 500);
	}
});

console.log("Quester desktop started");
