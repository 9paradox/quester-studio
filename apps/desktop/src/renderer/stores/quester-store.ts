import {
	type EditorTab,
	createEnvEditorTab,
	createFlowEditorTab,
	createRequestEditorTab,
	createSecretsEditorTab,
	editorTabLabel,
	envTabId,
	flowTabId,
	requestTabId,
	secretsTabId,
} from "@/lib/editorTabs.js";
import { desktopRpc } from "@/lib/electrobun.js";
import {
	addNodeToFlow,
	deleteEdgesFromFlow,
	deleteNodesFromFlow,
	duplicateNodeInFlow,
	reactFlowToFlow,
} from "@/lib/flowEditor.js";
import type { ActivityView } from "@/lib/nodeCatalog.js";
import { DEFAULT_INPUT } from "@/lib/runDefaults.js";
import type { BuiltinNodeType, FlowV1, RequestV1 } from "@quester/schema";
import { SECRETS_VERSION } from "@quester/schema";
import type { Edge, Node } from "reactflow";
import { create } from "zustand";
import type {
	ExecuteFlowRpcResult,
	ExecuteRequestRpcResult,
	FlowMeta,
	RequestMeta,
	SecretFileMeta,
} from "../../shared/rpc.js";
import {
	type KeyValueRow,
	rowsToEnvVariables,
	rowsToStringRecord,
} from "../components/KeyValueEditor.js";
import { clamp } from "../components/ResizeGutter.js";
import { slugifyName } from "./slugify.js";

export type RightPanelTab = "inspector" | "response";
export type PanelTab = "console" | "logs";

const DEFAULT_PANEL_HEIGHT = 180;
const DEFAULT_SIDEBAR_WIDTH = 240;
const DEFAULT_RIGHT_WIDTH = 320;
const INSPECTOR_AUTOSAVE_MS = 500;

let inspectorAutosaveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleInspectorAutosave() {
	if (inspectorAutosaveTimer) clearTimeout(inspectorAutosaveTimer);
	inspectorAutosaveTimer = setTimeout(() => {
		inspectorAutosaveTimer = null;
		void useQuesterStore.getState().saveActiveTab();
	}, INSPECTOR_AUTOSAVE_MS);
}

export function cancelInspectorAutosave() {
	if (!inspectorAutosaveTimer) return;
	clearTimeout(inspectorAutosaveTimer);
	inspectorAutosaveTimer = null;
}

function flowJsonEqual(a: FlowV1, b: FlowV1): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

function mapOpenTabsIfChanged(
	tabs: EditorTab[],
	mapper: (tab: EditorTab) => EditorTab,
): EditorTab[] | null {
	let changed = false;
	const next = tabs.map((tab) => {
		const updated = mapper(tab);
		if (updated !== tab) changed = true;
		return updated;
	});
	return changed ? next : null;
}

export type QuesterState = {
	workspacePath: string;
	workspaceName: string;
	flows: FlowMeta[];
	requests: RequestMeta[];
	envs: string[];
	secretFiles: SecretFileMeta[];
	selectedEnv: string;
	isLoading: boolean;
	loadError: string | null;

	openTabs: EditorTab[];
	activeTabId: string | null;
	selectedNodeId: string | null;
	zoom: number;

	activityView: ActivityView;
	sidebarOpen: boolean;
	rightPanelOpen: boolean;
	rightPanelTab: RightPanelTab;
	/** True when canvas graph edits need an explicit Save (inspector autosaves). */
	canvasDirty: boolean;
	panelOpen: boolean;
	panelHeight: number;
	panelTab: PanelTab;
	sidebarSearch: string;
	sidebarWidth: number;
	rightPanelWidth: number;

	inputJson: string;
	inputError: string | null;
	playgroundOpen: boolean;
	runResult: ExecuteFlowRpcResult | null;
	runError: string | null;
	isRunning: boolean;
	requestResult: ExecuteRequestRpcResult | null;
	requestError: string | null;
	isSendingRequest: boolean;
	consoleLines: string[];

	setActiveTabId: (tabId: string | null) => void;
	setSelectedEnv: (env: string) => void;
	setActivityView: (view: ActivityView) => void;
	setSidebarOpen: (open: boolean) => void;
	setRightPanelOpen: (open: boolean) => void;
	setRightPanelTab: (tab: RightPanelTab) => void;
	setPanelOpen: (open: boolean) => void;
	setPanelHeight: (height: number) => void;
	setPanelTab: (tab: PanelTab) => void;
	setSidebarSearch: (search: string) => void;
	setZoom: (zoom: number) => void;
	setInputJson: (json: string) => void;
	setPlaygroundOpen: (open: boolean) => void;
	togglePanel: () => void;
	resizeSidebar: (delta: number) => void;
	resizeRightPanel: (delta: number) => void;
	handleRightPanelView: (tab: RightPanelTab) => void;

	appendConsole: (line: string) => void;
	clearConsole: () => void;
	showError: (message: string) => void;
	handleActivityView: (view: ActivityView) => void;
	openTab: (tab: EditorTab) => void;
	refreshWorkspaceLists: (path: string) => Promise<{
		flowList: FlowMeta[];
		envList: string[];
		secretsList: SecretFileMeta[];
		requestList: RequestMeta[];
	}>;
	loadFlow: (flowId: string, workspace: string) => Promise<void>;
	loadEnvironment: (envName: string, workspace: string) => Promise<void>;
	loadSecretsFile: (envName: string, workspace: string) => Promise<void>;
	loadRequest: (requestPath: string, workspace: string) => Promise<void>;
	loadWorkspace: (path: string) => Promise<void>;
	openWorkspacePicker: () => Promise<void>;
	updateActiveFlow: (
		updater: (flow: FlowV1) => FlowV1,
		dirty?: boolean,
	) => void;
	handleGraphChange: (nodes: Node[], edges: Edge[]) => void;
	handleEnvRowsChange: (rows: KeyValueRow[]) => void;
	handleSecretRowsChange: (rows: KeyValueRow[]) => void;
	handleRequestChange: (request: RequestV1) => void;
	handleAddNode: (
		type: BuiltinNodeType,
		position?: { x: number; y: number },
	) => void;
	handleDropRequest: (
		requestPath: string,
		position?: { x: number; y: number },
	) => Promise<void>;
	handleSelectNode: (nodeId: string | null) => void;
	handleUpdateNode: (nodeId: string, data: Record<string, unknown>) => void;
	deleteNodes: (nodeIds: string[]) => void;
	deleteEdges: (edgeIds: string[]) => void;
	duplicateNode: (nodeId: string) => void;
	closeTab: (tabId: string) => void;
	saveActiveTab: (tabId?: string | null) => Promise<void>;
	createFlow: () => Promise<void>;
	createEnv: () => Promise<void>;
	createSecretsFile: () => Promise<void>;
	createCollection: () => Promise<void>;
	createRequest: (collection?: string) => Promise<void>;
	deleteRequest: (requestPath: string) => Promise<void>;
	addRequestToCanvas: (requestPath: string) => Promise<void>;
	renameFlow: (flowId: string) => Promise<void>;
	deleteFlow: (flowId: string) => Promise<void>;
	runFlow: () => Promise<void>;
	sendRequest: () => Promise<void>;
};

export const useQuesterStore = create<QuesterState>((set, get) => ({
	workspacePath: "",
	workspaceName: "",
	flows: [],
	requests: [],
	envs: [],
	secretFiles: [],
	selectedEnv: "local",
	isLoading: true,
	loadError: null,

	openTabs: [],
	activeTabId: null,
	selectedNodeId: null,
	zoom: 1,

	activityView: "flows",
	sidebarOpen: true,
	rightPanelOpen: true,
	rightPanelTab: "inspector",
	canvasDirty: false,
	panelOpen: true,
	panelHeight: DEFAULT_PANEL_HEIGHT,
	panelTab: "console",
	sidebarSearch: "",
	sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
	rightPanelWidth: DEFAULT_RIGHT_WIDTH,

	inputJson: DEFAULT_INPUT,
	inputError: null,
	playgroundOpen: false,
	runResult: null,
	runError: null,
	isRunning: false,
	requestResult: null,
	requestError: null,
	isSendingRequest: false,
	consoleLines: ["> Quester ready"],

	setActiveTabId: (tabId) =>
		set((s) => {
			if (s.activeTabId === tabId) return s;
			const tab = s.openTabs.find((t) => t.id === tabId);
			return {
				activeTabId: tabId,
				canvasDirty: Boolean(tab?.kind === "flow" && tab.dirty),
			};
		}),
	setSelectedEnv: (env) =>
		set((s) => (s.selectedEnv === env ? s : { selectedEnv: env })),
	setActivityView: (view) =>
		set((s) => (s.activityView === view ? s : { activityView: view })),
	setSidebarOpen: (open) =>
		set((s) => (s.sidebarOpen === open ? s : { sidebarOpen: open })),
	setRightPanelOpen: (open) =>
		set((s) => (s.rightPanelOpen === open ? s : { rightPanelOpen: open })),
	setRightPanelTab: (tab) =>
		set((s) => (s.rightPanelTab === tab ? s : { rightPanelTab: tab })),
	setPanelOpen: (open) =>
		set((s) => (s.panelOpen === open ? s : { panelOpen: open })),
	setPanelHeight: (height) =>
		set((s) => (s.panelHeight === height ? s : { panelHeight: height })),
	setPanelTab: (tab) => set({ panelTab: tab }),
	setSidebarSearch: (search) => set({ sidebarSearch: search }),
	setZoom: (zoom) => set((s) => (s.zoom === zoom ? s : { zoom })),
	setInputJson: (json) => set({ inputJson: json }),
	setPlaygroundOpen: (open) => set({ playgroundOpen: open }),
	togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
	resizeSidebar: (delta) =>
		set((s) => {
			const sidebarWidth = clamp(s.sidebarWidth + delta, 180, 480);
			return s.sidebarWidth === sidebarWidth ? s : { sidebarWidth };
		}),
	resizeRightPanel: (delta) =>
		set((s) => {
			const rightPanelWidth = clamp(s.rightPanelWidth - delta, 260, 560);
			return s.rightPanelWidth === rightPanelWidth ? s : { rightPanelWidth };
		}),
	handleRightPanelView: (tab) => {
		const { rightPanelOpen, rightPanelTab } = get();
		if (rightPanelOpen && rightPanelTab === tab) {
			set({ rightPanelOpen: false });
			return;
		}
		set({ rightPanelTab: tab, rightPanelOpen: true });
	},

	appendConsole: (line) =>
		set((s) => ({ consoleLines: [...s.consoleLines, `> ${line}`] })),
	clearConsole: () => set({ consoleLines: ["> Console cleared"] }),
	showError: (message) =>
		set({ runError: message, panelTab: "logs", panelOpen: true }),

	handleActivityView: (view) => {
		const { sidebarOpen, activityView } = get();
		if (sidebarOpen && activityView === view) {
			set({ sidebarOpen: false });
			return;
		}
		set({ activityView: view, sidebarOpen: true });
	},

	openTab: (tab) => {
		set((s) => {
			const existing = s.openTabs.find((t) => t.id === tab.id);
			const openTabs = existing
				? s.openTabs.map((t) =>
						t.id === tab.id ? (t.dirty ? t : { ...tab, dirty: false }) : t,
					)
				: [...s.openTabs, tab];
			const active = openTabs.find((t) => t.id === tab.id);
			return {
				openTabs,
				activeTabId: tab.id,
				selectedNodeId: tab.kind === "flow" ? null : s.selectedNodeId,
				canvasDirty: Boolean(active?.kind === "flow" && active.dirty),
			};
		});
	},

	refreshWorkspaceLists: async (path) => {
		const [flowList, envList, secretsList, requestList] = await Promise.all([
			desktopRpc.listFlows(path),
			desktopRpc.listEnvs(path),
			desktopRpc.listSecretFiles(path),
			desktopRpc.listCollectionRequests(path),
		]);
		set({
			flows: flowList,
			envs: envList,
			secretFiles: secretsList,
			requests: requestList,
		});
		return { flowList, envList, secretsList, requestList };
	},

	loadFlow: async (flowId, workspace) => {
		const tabId = flowTabId(flowId);
		const existing = get().openTabs.find((t) => t.id === tabId);
		if (existing) {
			set({
				activeTabId: tabId,
				selectedNodeId: null,
				canvasDirty: Boolean(existing.kind === "flow" && existing.dirty),
			});
			return;
		}
		const flow = await desktopRpc.loadFlow(flowId, workspace);
		get().openTab(createFlowEditorTab(flow));
	},

	loadEnvironment: async (envName, workspace) => {
		const tabId = envTabId(envName);
		const existing = get().openTabs.find((t) => t.id === tabId);
		if (existing) {
			set({ activeTabId: tabId });
			return;
		}
		const environment = await desktopRpc.loadEnvironment(workspace, envName);
		get().openTab(createEnvEditorTab(environment));
	},

	loadSecretsFile: async (envName, workspace) => {
		const tabId = secretsTabId(envName);
		const existing = get().openTabs.find((t) => t.id === tabId);
		if (existing) {
			set({ activeTabId: tabId });
			return;
		}
		const secrets = await desktopRpc.loadSecretsFile(workspace, envName);
		get().openTab(createSecretsEditorTab(envName, secrets));
	},

	loadRequest: async (requestPath, workspace) => {
		const tabId = requestTabId(requestPath);
		const existing = get().openTabs.find((t) => t.id === tabId);
		if (existing) {
			set({
				activeTabId: tabId,
				requestResult: null,
				requestError: null,
			});
			return;
		}
		const request = await desktopRpc.loadRequest(workspace, requestPath);
		get().openTab(createRequestEditorTab(requestPath, request));
		set({ requestResult: null, requestError: null });
	},

	loadWorkspace: async (path) => {
		const { refreshWorkspaceLists, loadFlow, appendConsole } = get();
		set({
			isLoading: true,
			loadError: null,
			runResult: null,
			runError: null,
			openTabs: [],
			activeTabId: null,
			canvasDirty: false,
		});
		try {
			const summary = await desktopRpc.openWorkspaceSummary(path);
			const { flowList, envList } = await refreshWorkspaceLists(path);
			const env = envList[0] ?? "local";
			set({
				workspacePath: path,
				workspaceName: summary.name,
				selectedEnv: env,
			});
			appendConsole(`Workspace loaded: ${summary.name}`);

			const firstFlow = flowList[0];
			if (firstFlow) {
				await loadFlow(firstFlow.id, path);
			}
		} catch (err) {
			set({
				loadError:
					err instanceof Error ? err.message : "Failed to load workspace",
			});
		} finally {
			set({ isLoading: false });
		}
	},

	openWorkspacePicker: async () => {
		try {
			const path = await desktopRpc.pickWorkspaceFolder();
			if (path) await get().loadWorkspace(path);
		} catch (err) {
			set({
				loadError:
					err instanceof Error ? err.message : "Failed to open workspace",
			});
		}
	},

	updateActiveFlow: (updater, dirty = true) => {
		const { activeTabId } = get();
		if (!activeTabId) return;
		set((s) => {
			const openTabs = mapOpenTabsIfChanged(s.openTabs, (t) => {
				if (t.id !== activeTabId || t.kind !== "flow") return t;
				const flow = updater(t.flow);
				if (flowJsonEqual(flow, t.flow)) return t;
				return {
					...t,
					flow,
					dirty: dirty ? true : t.dirty,
				};
			});
			return openTabs ? { openTabs } : s;
		});
	},

	handleGraphChange: (nodes, edges) => {
		const { activeTabId } = get();
		if (!activeTabId) return;
		set((s) => {
			const openTabs = mapOpenTabsIfChanged(s.openTabs, (t) => {
				if (t.id !== activeTabId || t.kind !== "flow") return t;
				const next = reactFlowToFlow(t.flow, nodes, edges);
				if (flowJsonEqual(next, t.flow)) return t;
				return { ...t, flow: next, dirty: true };
			});
			if (!openTabs) return s;
			return { openTabs, canvasDirty: true };
		});
	},

	handleEnvRowsChange: (rows) => {
		const { activeTabId } = get();
		if (!activeTabId) return;
		set((s) => ({
			openTabs: s.openTabs.map((t) =>
				t.id === activeTabId && t.kind === "env"
					? {
							...t,
							rows,
							environment: {
								...t.environment,
								variables: rowsToEnvVariables(rows),
							},
							dirty: true,
						}
					: t,
			),
		}));
	},

	handleSecretRowsChange: (rows) => {
		const { activeTabId } = get();
		if (!activeTabId) return;
		set((s) => ({
			openTabs: s.openTabs.map((t) =>
				t.id === activeTabId && t.kind === "secrets"
					? {
							...t,
							rows,
							secrets: {
								version: SECRETS_VERSION,
								secrets: rowsToStringRecord(rows),
							},
							dirty: true,
						}
					: t,
			),
		}));
	},

	handleRequestChange: (request) => {
		const { activeTabId } = get();
		if (!activeTabId) return;
		set((s) => ({
			openTabs: s.openTabs.map((t) =>
				t.id === activeTabId && t.kind === "request"
					? { ...t, request, dirty: true }
					: t,
			),
		}));
	},

	handleAddNode: (type, position) => {
		get().updateActiveFlow((flow) => addNodeToFlow(flow, type, position));
		set({
			rightPanelOpen: true,
			rightPanelTab: "inspector",
			canvasDirty: true,
		});
	},

	handleDropRequest: async (requestPath, position) => {
		const { workspacePath, showError } = get();
		if (!workspacePath) return;
		try {
			const request = await desktopRpc.loadRequest(workspacePath, requestPath);
			get().updateActiveFlow((flow) => {
				const next = addNodeToFlow(flow, "http", position);
				const last = next.nodes[next.nodes.length - 1];
				if (!last) return next;
				return {
					...next,
					nodes: next.nodes.map((n) =>
						n.id === last.id
							? {
									...n,
									data: {
										label: request.name,
										method: request.method,
										url: request.url,
										headers: request.headers,
										...(request.body !== undefined
											? { body: request.body }
											: {}),
									},
								}
							: n,
					),
				};
			});
			set({
				rightPanelOpen: true,
				rightPanelTab: "inspector",
				canvasDirty: true,
			});
		} catch (err) {
			showError(
				err instanceof Error ? err.message : "Failed to add request to canvas",
			);
		}
	},

	addRequestToCanvas: async (requestPath) => {
		await get().handleDropRequest(requestPath);
	},

	handleSelectNode: (nodeId) => {
		const state = get();
		if (state.selectedNodeId === nodeId) return;
		set({
			selectedNodeId: nodeId,
			...(nodeId ? { rightPanelOpen: true } : {}),
		});
	},

	handleUpdateNode: (nodeId, data) => {
		get().updateActiveFlow((flow) => ({
			...flow,
			nodes: flow.nodes.map((n) => (n.id === nodeId ? { ...n, data } : n)),
		}));
		scheduleInspectorAutosave();
	},

	deleteNodes: (nodeIds) => {
		if (nodeIds.length === 0) return;
		get().updateActiveFlow((flow) => deleteNodesFromFlow(flow, nodeIds));
		const { selectedNodeId } = get();
		set({
			canvasDirty: true,
			...(selectedNodeId && nodeIds.includes(selectedNodeId)
				? { selectedNodeId: null }
				: {}),
		});
	},

	deleteEdges: (edgeIds) => {
		if (edgeIds.length === 0) return;
		get().updateActiveFlow((flow) => deleteEdgesFromFlow(flow, edgeIds));
		set({ canvasDirty: true });
	},

	duplicateNode: (nodeId) => {
		let newId: string | null = null;
		get().updateActiveFlow((flow) => {
			const result = duplicateNodeInFlow(flow, nodeId);
			if (!result) return flow;
			newId = result.newNodeId;
			return result.flow;
		});
		if (!newId) return;
		set({
			selectedNodeId: newId,
			rightPanelOpen: true,
			rightPanelTab: "inspector",
			canvasDirty: true,
		});
	},

	closeTab: (tabId) => {
		const { openTabs, activeTabId } = get();
		const tab = openTabs.find((t) => t.id === tabId);
		if (tab?.dirty) {
			const ok = window.confirm(
				`Close ${editorTabLabel(tab)} with unsaved changes?`,
			);
			if (!ok) return;
		}
		const remaining = openTabs.filter((t) => t.id !== tabId);
		set({
			openTabs: remaining,
			activeTabId:
				activeTabId === tabId ? (remaining[0]?.id ?? null) : activeTabId,
		});
	},

	saveActiveTab: async (tabId = get().activeTabId) => {
		cancelInspectorAutosave();
		const {
			workspacePath,
			openTabs,
			activeTabId,
			appendConsole,
			refreshWorkspaceLists,
			showError,
		} = get();
		if (!tabId || !workspacePath) return;
		const tab = openTabs.find((t) => t.id === tabId);
		if (!tab?.dirty) return;
		try {
			if (tab.kind === "flow") {
				const saved = await desktopRpc.saveFlow(tab.flow, workspacePath);
				set((s) => ({
					openTabs: s.openTabs.map((t) =>
						t.id === tab.id
							? {
									...t,
									flowId: saved.id,
									flow: saved,
									dirty: false,
									id: flowTabId(saved.id),
								}
							: t,
					),
					activeTabId:
						activeTabId === tab.id ? flowTabId(saved.id) : s.activeTabId,
					canvasDirty: false,
				}));
				appendConsole(`Saved flow ${saved.id}`);
			} else if (tab.kind === "env") {
				const saved = await desktopRpc.saveEnvironment(
					workspacePath,
					tab.environment,
				);
				set((s) => ({
					openTabs: s.openTabs.map((t) =>
						t.id === tab.id && t.kind === "env"
							? {
									...t,
									environment: saved,
									envName: saved.name,
									rows: t.rows,
									id: envTabId(saved.name),
									dirty: false,
								}
							: t,
					),
					activeTabId:
						activeTabId === tab.id ? envTabId(saved.name) : s.activeTabId,
				}));
				appendConsole(`Saved ${saved.name}.json`);
			} else if (tab.kind === "secrets") {
				const saved = await desktopRpc.saveSecretsFile(
					workspacePath,
					tab.envName,
					tab.secrets,
				);
				set((s) => ({
					openTabs: s.openTabs.map((t) =>
						t.id === tab.id && t.kind === "secrets"
							? { ...t, secrets: saved, rows: t.rows, dirty: false }
							: t,
					),
				}));
				appendConsole(`Saved ${tab.envName}.secrets.json`);
			} else if (tab.kind === "request") {
				const saved = await desktopRpc.saveRequest(
					workspacePath,
					tab.requestPath,
					tab.request,
				);
				set((s) => ({
					openTabs: s.openTabs.map((t) =>
						t.id === tab.id && t.kind === "request"
							? { ...t, request: saved, dirty: false }
							: t,
					),
				}));
				appendConsole(`Saved request ${tab.requestPath}`);
			}
			await refreshWorkspaceLists(workspacePath);
		} catch (err) {
			showError(err instanceof Error ? err.message : "Save failed");
		}
	},

	createFlow: async () => {
		const {
			workspacePath,
			refreshWorkspaceLists,
			openTab,
			appendConsole,
			showError,
		} = get();
		if (!workspacePath) return;
		const name = window.prompt("New flow name");
		if (!name?.trim()) return;
		const flowId = slugifyName(name);
		try {
			const flow = await desktopRpc.createFlow(
				workspacePath,
				flowId,
				name.trim(),
			);
			await refreshWorkspaceLists(workspacePath);
			openTab(createFlowEditorTab(flow));
			appendConsole(`Created flow ${flow.id}`);
		} catch (err) {
			showError(err instanceof Error ? err.message : "Create flow failed");
		}
	},

	createEnv: async () => {
		const {
			workspacePath,
			refreshWorkspaceLists,
			openTab,
			appendConsole,
			showError,
		} = get();
		if (!workspacePath) return;
		const name = window.prompt("New environment name");
		if (!name?.trim()) return;
		const envName = slugifyName(name);
		try {
			const environment = await desktopRpc.createEnvironment(
				workspacePath,
				envName,
			);
			await refreshWorkspaceLists(workspacePath);
			openTab(createEnvEditorTab(environment));
			appendConsole(`Created ${envName}.json`);
		} catch (err) {
			showError(
				err instanceof Error ? err.message : "Create environment failed",
			);
		}
	},

	createSecretsFile: async () => {
		const {
			workspacePath,
			envs,
			refreshWorkspaceLists,
			openTab,
			appendConsole,
			showError,
		} = get();
		if (!workspacePath) return;
		const name = window.prompt(
			"Environment name for secrets file",
			envs[0] ?? "local",
		);
		if (!name?.trim()) return;
		const envName = slugifyName(name);
		try {
			const secrets = await desktopRpc.createSecretsFile(
				workspacePath,
				envName,
			);
			await refreshWorkspaceLists(workspacePath);
			openTab(createSecretsEditorTab(envName, secrets));
			appendConsole(`Created ${envName}.secrets.json`);
		} catch (err) {
			showError(err instanceof Error ? err.message : "Create secrets failed");
		}
	},

	renameFlow: async (flowId) => {
		const {
			workspacePath,
			flows,
			openTabs,
			activeTabId,
			refreshWorkspaceLists,
			appendConsole,
			showError,
		} = get();
		if (!workspacePath) return;
		const meta = flows.find((f) => f.id === flowId);
		const tab = openTabs.find((t) => t.kind === "flow" && t.flowId === flowId);
		const currentName =
			tab?.kind === "flow"
				? (tab.flow.name ?? tab.flowId)
				: (meta?.name ?? flowId);
		const name = window.prompt("Rename flow", currentName);
		if (!name?.trim() || name.trim() === currentName) return;

		const newId = slugifyName(name);
		try {
			const saved = await desktopRpc.renameFlow(
				workspacePath,
				flowId,
				newId,
				name.trim(),
			);
			await refreshWorkspaceLists(workspacePath);
			const newTabId = flowTabId(saved.id);
			set((s) => ({
				openTabs: s.openTabs.map((t) =>
					t.kind === "flow" && t.flowId === flowId
						? {
								...t,
								flowId: saved.id,
								flow: saved,
								dirty: false,
								id: newTabId,
							}
						: t,
				),
				activeTabId:
					activeTabId === flowTabId(flowId) ? newTabId : s.activeTabId,
			}));
			appendConsole(`Renamed flow to ${saved.id}`);
		} catch (err) {
			showError(err instanceof Error ? err.message : "Rename failed");
		}
	},

	deleteFlow: async (flowId) => {
		const {
			workspacePath,
			flows,
			openTabs,
			activeTabId,
			refreshWorkspaceLists,
			saveActiveTab,
			appendConsole,
			showError,
		} = get();
		if (!workspacePath) return;
		const meta = flows.find((f) => f.id === flowId);
		const tabId = flowTabId(flowId);
		const tab = openTabs.find((t) => t.id === tabId);
		if (tab?.dirty) {
			const saveFirst = window.confirm(
				`${meta?.name ?? flowId} has unsaved changes. Save before deleting?`,
			);
			if (saveFirst) await saveActiveTab(tabId);
		}
		const ok = window.confirm(`Delete ${meta?.name ?? flowId}?`);
		if (!ok) return;
		try {
			await desktopRpc.deleteFlow(workspacePath, flowId);
			await refreshWorkspaceLists(workspacePath);
			const remaining = openTabs.filter((t) => t.id !== tabId);
			set({
				openTabs: remaining,
				activeTabId:
					activeTabId === tabId ? (remaining[0]?.id ?? null) : activeTabId,
			});
			appendConsole(`Deleted flow ${flowId}`);
		} catch (err) {
			showError(err instanceof Error ? err.message : "Delete failed");
		}
	},

	runFlow: async () => {
		const {
			inputJson,
			workspacePath,
			selectedEnv,
			appendConsole,
			openTabs,
			activeTabId,
		} = get();
		const activeTab = openTabs.find((t) => t.id === activeTabId);
		const activeFlowTab = activeTab?.kind === "flow" ? activeTab : null;
		if (!activeFlowTab || !workspacePath) return;

		let input: unknown;
		try {
			input = JSON.parse(inputJson);
			set({ inputError: null });
		} catch {
			set({ inputError: "Invalid JSON input", playgroundOpen: true });
			return;
		}

		set({
			isRunning: true,
			runError: null,
			runResult: null,
			panelOpen: true,
			panelTab: "logs",
			rightPanelOpen: true,
			rightPanelTab: "response",
		});
		appendConsole(`Run started: ${activeFlowTab.flowId}`);

		try {
			const result = await desktopRpc.executeFlowRpc({
				flowId: activeFlowTab.flowId,
				workspace: workspacePath,
				env: selectedEnv,
				input,
			});
			set({
				runResult: result,
				runError: result.error ?? null,
			});
			if (result.error) {
				appendConsole(`Run failed: ${result.error}`);
				const failedStep = result.steps.find((s) => s.error);
				if (failedStep) {
					appendConsole(
						`Failed node: ${failedStep.type} (${failedStep.nodeId})`,
					);
					appendConsole(
						JSON.stringify(
							{ input: failedStep.input, error: failedStep.error },
							null,
							2,
						),
					);
				}
				for (const entry of result.logs.filter((l) => l.level === "error")) {
					appendConsole(entry.message);
					if (entry.data !== undefined) {
						appendConsole(JSON.stringify(entry.data, null, 2));
					}
				}
			} else {
				appendConsole("Run finished");
			}
		} catch (err) {
			const message =
				err instanceof Error
					? [err.message, err.stack].filter(Boolean).join("\n")
					: "Flow execution failed";
			set({ runError: err instanceof Error ? err.message : message });
			appendConsole(message);
		} finally {
			set({ isRunning: false });
		}
	},

	createCollection: async () => {
		const { workspacePath, refreshWorkspaceLists, appendConsole, showError } =
			get();
		if (!workspacePath) return;
		const name = window.prompt("New collection name");
		if (!name?.trim()) return;
		try {
			await desktopRpc.createCollection(workspacePath, name.trim());
			await refreshWorkspaceLists(workspacePath);
			appendConsole(`Created collection ${name.trim()}`);
		} catch (err) {
			showError(
				err instanceof Error ? err.message : "Create collection failed",
			);
		}
	},

	createRequest: async (collection) => {
		const {
			workspacePath,
			refreshWorkspaceLists,
			openTab,
			appendConsole,
			showError,
		} = get();
		if (!workspacePath) return;
		const name = window.prompt("New request name");
		if (!name?.trim()) return;
		const slug = slugifyName(name);
		const requestPath = collection ? `${collection}/${slug}` : slug;
		try {
			const request = await desktopRpc.createRequest(
				workspacePath,
				requestPath,
				name.trim(),
			);
			await refreshWorkspaceLists(workspacePath);
			openTab(createRequestEditorTab(requestPath, request));
			appendConsole(`Created request ${requestPath}`);
		} catch (err) {
			showError(err instanceof Error ? err.message : "Create request failed");
		}
	},

	deleteRequest: async (requestPath) => {
		const {
			workspacePath,
			openTabs,
			activeTabId,
			refreshWorkspaceLists,
			appendConsole,
			showError,
		} = get();
		if (!workspacePath) return;
		const ok = window.confirm(`Delete request ${requestPath}?`);
		if (!ok) return;
		try {
			await desktopRpc.deleteRequest(workspacePath, requestPath);
			await refreshWorkspaceLists(workspacePath);
			const tabId = requestTabId(requestPath);
			const remaining = openTabs.filter((t) => t.id !== tabId);
			set({
				openTabs: remaining,
				activeTabId:
					activeTabId === tabId ? (remaining[0]?.id ?? null) : activeTabId,
			});
			appendConsole(`Deleted request ${requestPath}`);
		} catch (err) {
			showError(err instanceof Error ? err.message : "Delete request failed");
		}
	},

	sendRequest: async () => {
		const {
			workspacePath,
			selectedEnv,
			openTabs,
			activeTabId,
			appendConsole,
			saveActiveTab,
		} = get();
		const tab = openTabs.find((t) => t.id === activeTabId);
		if (!tab || tab.kind !== "request" || !workspacePath) return;

		if (tab.dirty) {
			await saveActiveTab(tab.id);
		}

		set({
			isSendingRequest: true,
			requestError: null,
			requestResult: null,
		});
		appendConsole(`Send request: ${tab.requestPath}`);

		try {
			const result = await desktopRpc.executeRequestRpc({
				requestPath: tab.requestPath,
				workspace: workspacePath,
				env: selectedEnv,
			});
			set({
				requestResult: result,
				requestError: result.error ?? null,
			});
			if (result.error) {
				appendConsole(`Request failed: ${result.error}`);
			} else {
				appendConsole("Request finished");
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Request execution failed";
			set({ requestError: message });
			appendConsole(message);
		} finally {
			set({ isSendingRequest: false });
		}
	},
}));
