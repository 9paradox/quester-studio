import { BrowserView, BrowserWindow } from "electrobun/bun";
import type { DesktopRPC, NodeRunStatusEvent } from "../shared/rpc.js";
import { resolvePreferredDark, setThemePreference } from "./appPreferences.js";
import {
	applyWindowChrome,
	setAttachedTitleBarDarkMode,
} from "./windowChrome.js";

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

function sendNodeRunStatus(
	rpcInstance: ReturnType<typeof BrowserView.defineRPC<DesktopRPC>>,
	event: NodeRunStatusEvent,
) {
	try {
		rpcInstance.send.nodeRunStatus(event);
	} catch (err) {
		console.error("Failed to send nodeRunStatus", err);
	}
}

const rpc = BrowserView.defineRPC<DesktopRPC>({
	/** Long ceiling so slow flows / delays aren't cut off at 30s (B5). */
	maxRequestTime: 3_600_000,
	handlers: {
		requests: {
			getDefaultWorkspace: async () =>
				(await import("./handlers.js")).getDefaultWorkspace(),
			pickWorkspaceFolder: async () =>
				(await import("./handlers.js")).pickWorkspaceFolder(),
			pickCollectionFile: async () =>
				(await import("./handlers.js")).pickCollectionFile(),
			scaffoldWorkspace: async ({ path, name }) =>
				(await import("./handlers.js")).scaffoldWorkspaceRpc(path, name),
			openWorkspaceSummary: async ({ path }) =>
				(await import("./handlers.js")).openWorkspaceSummary(path),
			loadWorkspaceManifest: async ({ workspace }) =>
				(await import("./handlers.js")).loadWorkspaceManifest(workspace),
			saveWorkspaceManifest: async ({ workspace, manifest }) =>
				(await import("./handlers.js")).saveWorkspaceManifest(
					workspace,
					manifest,
				),
			listFlows: async ({ workspace }) =>
				(await import("./handlers.js")).listFlows(workspace),
			listEnvs: async ({ workspace }) =>
				(await import("./handlers.js")).listEnvs(workspace),
			loadFlow: async ({ flowId, workspace }) =>
				(await import("./handlers.js")).loadFlow(flowId, workspace),
			executeFlowRpc: async ({ flowId, workspace, env, input, runId }) =>
				(await import("./handlers.js")).executeFlowRpc(flowId, {
					workspace,
					env,
					input,
					runId,
					onNodeStatus: (event) => {
						sendNodeRunStatus(rpc, {
							runId,
							flowId,
							nodeId: event.nodeId,
							nodeType: event.nodeType,
							status: event.status,
							ts: event.ts,
						});
					},
				}),
			cancelFlowRun: async ({ runId }) => {
				const { cancelFlowRun } = await import("./handlers.js");
				return { ok: cancelFlowRun(runId) };
			},
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
			listCollections: async ({ workspace }) =>
				(await import("./handlers.js")).listCollections(workspace),
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
			importCollection: async ({ workspace, filePath }) =>
				(await import("./handlers.js")).importCollection(workspace, filePath),
			executeRequestRpc: async ({ requestPath, workspace, env }) =>
				(await import("./handlers.js")).executeRequestRpc(requestPath, {
					workspace,
					env,
				}),
			readPathShapes: async ({ workspace }) =>
				(await import("./handlers.js")).readPathShapes(workspace),
			writePathShapes: async ({ workspace, data }) =>
				(await import("./handlers.js")).writePathShapes(workspace, data),
			setAppTlsVerify: async ({ verifyTls }) => {
				const { setAppTlsVerify } = await import("./handlers.js");
				setAppTlsVerify(verifyTls);
				return { ok: true as const, verifyTls };
			},
			getAppTlsVerify: async () => {
				const { getAppTlsVerify } = await import("./handlers.js");
				return { verifyTls: getAppTlsVerify() };
			},
			openPathInOs: async ({ path }) =>
				(await import("./handlers.js")).openPathInOs(path),
			listRunTree: async ({ workspace }) =>
				(await import("./handlers.js")).listRunTree(workspace),
			readRunJson: async ({ workspace, relativePath }) =>
				(await import("./handlers.js")).readRunJson(workspace, relativePath),
			deleteRunPath: async ({ workspace, relativePath }) =>
				(await import("./handlers.js")).deleteRunPath(workspace, relativePath),
			setNativeChromeTheme: async ({ theme }) => {
				const dark = setThemePreference(theme);
				setAttachedTitleBarDarkMode(dark);
				return { ok: true as const, dark, theme };
			},
			getMcpConfigSnippet: async ({ workspace }) => {
				const { buildMcpConfigSnippet } = await import("./flow-watch.js");
				return buildMcpConfigSnippet(workspace);
			},
			watchFlows: async ({ workspace }) => {
				const { watchFlows } = await import("./flow-watch.js");
				return watchFlows(workspace, (event) => {
					try {
						rpc.send.flowFileChanged(event);
					} catch (err) {
						console.error("Failed to send flowFileChanged", err);
					}
				});
			},
			stopWatchFlows: async ({ workspace }) => {
				const { stopWatchFlows } = await import("./flow-watch.js");
				return stopWatchFlows(workspace);
			},
			watchMcpActivity: async ({ workspace }) => {
				const { watchMcpActivity } = await import("./mcp-activity-watch.js");
				return watchMcpActivity(workspace, (event) => {
					try {
						rpc.send.mcpActivity(event);
					} catch (err) {
						console.error("Failed to send mcpActivity", err);
					}
				});
			},
			stopWatchMcpActivity: async ({ workspace }) => {
				const { stopWatchMcpActivity } = await import(
					"./mcp-activity-watch.js"
				);
				return stopWatchMcpActivity(workspace);
			},
			startMcpServer: async ({ workspace }) => {
				const { startMcpServer } = await import("./mcp-process.js");
				ensureMcpStatusForwarding();
				return startMcpServer(workspace);
			},
			stopMcpServer: async () => {
				const { stopMcpServer } = await import("./mcp-process.js");
				ensureMcpStatusForwarding();
				return stopMcpServer();
			},
			getMcpServerStatus: async () => {
				const { getMcpServerStatus } = await import("./mcp-process.js");
				return getMcpServerStatus();
			},
		},
		messages: {},
	},
});

let mcpStatusForwarding = false;
function ensureMcpStatusForwarding() {
	if (mcpStatusForwarding) return;
	mcpStatusForwarding = true;
	void import("./mcp-process.js").then(({ onMcpServerStatus }) => {
		onMcpServerStatus((status) => {
			try {
				rpc.send.mcpServerStatus(status);
			} catch (err) {
				console.error("Failed to send mcpServerStatus", err);
			}
		});
	});
}

const bootDark = resolvePreferredDark();

const mainWindow = new BrowserWindow({
	title: "Quester Studio",
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

// Dev + packaged: Electrobun's win.icon only embeds on `build`, so set HWND
// icon/titlebar theme at runtime (fixes Bun icon + white caption on Windows).
applyWindowChrome(mainWindow.ptr, { dark: bootDark });

mainWindow.on("close", () => {
	process.exit(0);
});

mainWindow.webview.on("dom-ready", () => {
	console.log("Quester webview ready");
	// Re-apply icon after first paint — some Windows builds keep the host icon until then.
	applyWindowChrome(mainWindow.ptr, { dark: resolvePreferredDark() });
	if (process.env.DEV === "1") {
		// Defer DevTools so WebView2 finishes the first paint (avoids blank window on Windows).
		setTimeout(() => mainWindow.webview.openDevTools(), 500);
	}
});

console.log("Quester desktop started");
