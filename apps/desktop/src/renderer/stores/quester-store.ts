import {
	type EditorTab,
	type ResponseViewerSnapshot,
	createAppSettingsEditorTab,
	createEnvEditorTab,
	createFlowEditorTab,
	createRequestEditorTab,
	createResponseViewerTab,
	createSecretsEditorTab,
	createWorkspaceSettingsEditorTab,
	editorTabLabel,
	envTabId,
	flowTabId,
	requestTabId,
	secretsTabId,
} from "@/lib/editorTabs.js";
import {
	addNodeToFlow,
	deleteEdgesFromFlow,
	deleteNodesFromFlow,
	duplicateNodeInFlow,
	reactFlowToFlow,
} from "@/lib/flowEditor.js";
import { promptName } from "@/lib/namePrompt.js";
import type { ActivityView } from "@/lib/nodeCatalog.js";
import { flowHasInvalidNodeData } from "@/lib/nodeFieldErrors.js";
import { indexCollectionResponse, indexNodeOutputs } from "@/lib/pathIndex.js";
import {
	type PathShapeIndex,
	emptyPathShapeIndex,
	parsePathShapes,
	scheduleIdle,
	serializePathShapes,
} from "@/lib/pathShapes.js";
import { getQuesterClient } from "@/lib/quester-client.js";
import { DEFAULT_INPUT, withInputNodeValue } from "@/lib/runDefaults.js";
import {
	appendRunHistory,
	findRunHistoryEntry,
	truncateResultForHistory,
} from "@/lib/runHistory.js";
import {
	clearLastWorkspacePath,
	readRecentWorkspacePaths,
	rememberWorkspacePath,
} from "@/lib/workspacePreference.js";
import type {
	BuiltinNodeType,
	FlowV1,
	HttpSettingsV1,
	RequestV1,
	WorkspaceV1,
} from "@quester-studio/schema";
import { SECRETS_VERSION } from "@quester-studio/schema";
import type { Edge, Node } from "reactflow";
import { toast } from "sonner";
import { create } from "zustand";
import type {
	ExecuteFlowRpcResult,
	ExecuteRequestRpcResult,
	FlowMeta,
	NodeRunStatus,
	NodeRunStatusEvent,
	RequestMeta,
	SecretFileMeta,
} from "../../shared/rpc.js";
import {
	type KeyValueRow,
	rowsToEnvVariables,
	rowsToStringRecord,
} from "../components/KeyValueEditor.js";
import { clamp } from "../components/ResizeGutter.js";
import {
	applyNodeStatusEvent,
	initNodeStatuses,
	reconcileNodeStatuses,
} from "../lib/nodeRunStatus.js";
import { slugifyName } from "./slugify.js";

function confirmDialog(message: string): boolean {
	const confirmFn =
		typeof globalThis.confirm === "function"
			? globalThis.confirm.bind(globalThis)
			: typeof window !== "undefined" && typeof confirmDialog === "function"
				? confirmDialog.bind(window)
				: null;
	if (!confirmFn) return true;
	return confirmFn(message);
}

export type RightPanelTab = "inspector" | "response";
export type PanelTab = "console" | "logs" | "history";
export type PathIndexStatus = "idle" | "updating";

/** Per-flow run slot (Response / Logs / canvas status). */
export type FlowRunState = {
	runResult: ExecuteFlowRpcResult | null;
	runError: string | null;
	isRunning: boolean;
	activeRunId: string | null;
	nodeStatuses: Record<string, NodeRunStatus>;
};

/** Per-collection-request send slot (result panel / Send spinner). */
export type RequestSendState = {
	result: ExecuteRequestRpcResult | null;
	error: string | null;
	isSending: boolean;
	sendId: string | null;
};

export function emptyFlowRunState(): FlowRunState {
	return {
		runResult: null,
		runError: null,
		isRunning: false,
		activeRunId: null,
		nodeStatuses: {},
	};
}

export function emptyRequestSendState(): RequestSendState {
	return {
		result: null,
		error: null,
		isSending: false,
		sendId: null,
	};
}

/** Stable reference for selectors when no run slot exists (avoids zustand rerender loops). */
export const STABLE_EMPTY_FLOW_RUN = emptyFlowRunState();
export const STABLE_EMPTY_REQUEST_SEND = emptyRequestSendState();

export function patchFlowRun(
	runByFlowId: Record<string, FlowRunState>,
	flowId: string,
	patch: Partial<FlowRunState>,
): Record<string, FlowRunState> {
	const prev = runByFlowId[flowId] ?? emptyFlowRunState();
	return { ...runByFlowId, [flowId]: { ...prev, ...patch } };
}

export function patchRequestSend(
	requestByPath: Record<string, RequestSendState>,
	requestPath: string,
	patch: Partial<RequestSendState>,
): Record<string, RequestSendState> {
	const prev = requestByPath[requestPath] ?? emptyRequestSendState();
	return { ...requestByPath, [requestPath]: { ...prev, ...patch } };
}

function cancelInFlightRuns(runByFlowId: Record<string, FlowRunState>): void {
	const client = getQuesterClient();
	for (const slot of Object.values(runByFlowId)) {
		if (slot.isRunning && slot.activeRunId) {
			void client.cancelFlowRun({ runId: slot.activeRunId });
		}
	}
}

const DEFAULT_PANEL_HEIGHT = 180;
const DEFAULT_SIDEBAR_WIDTH = 240;
const DEFAULT_RIGHT_WIDTH = 320;
const INSPECTOR_AUTOSAVE_MS = 500;
const PATH_SHAPES_WRITE_MS = 800;

let inspectorAutosaveTimer: ReturnType<typeof setTimeout> | null = null;
let pathShapesWriteTimer: ReturnType<typeof setTimeout> | null = null;

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

function schedulePathShapesPersist() {
	if (pathShapesWriteTimer) clearTimeout(pathShapesWriteTimer);
	pathShapesWriteTimer = setTimeout(() => {
		pathShapesWriteTimer = null;
		void persistPathShapes();
	}, PATH_SHAPES_WRITE_MS);
}

async function persistPathShapes() {
	const { workspacePath, pathShapeIndex } = useQuesterStore.getState();
	if (!workspacePath) return;
	try {
		await getQuesterClient().writePathShapes(
			workspacePath,
			serializePathShapes(pathShapeIndex),
		);
	} catch {
		/* non-blocking */
	}
}

function hydratePathShapes(workspace: string) {
	void (async () => {
		try {
			const raw = await getQuesterClient().readPathShapes(workspace);
			if (useQuesterStore.getState().workspacePath !== workspace) return;
			useQuesterStore.setState({
				pathShapeIndex: parsePathShapes(raw),
			});
		} catch {
			/* missing/corrupt → keep empty */
		}
	})();
}

function scheduleIndexNodeOutputs(
	nodeOutputs: Record<string, unknown> | undefined,
) {
	if (!nodeOutputs) return;
	useQuesterStore.setState({ pathIndexStatus: "updating" });
	scheduleIdle(() => {
		const { pathShapeIndex } = useQuesterStore.getState();
		const next = indexNodeOutputs(pathShapeIndex, nodeOutputs);
		useQuesterStore.setState({
			pathShapeIndex: next,
			pathIndexStatus: "idle",
		});
		schedulePathShapesPersist();
	});
}

function scheduleIndexCollectionResponse(
	requestPath: string,
	httpOutput: unknown,
) {
	if (httpOutput === undefined || httpOutput === null) return;
	useQuesterStore.setState({ pathIndexStatus: "updating" });
	scheduleIdle(() => {
		const { pathShapeIndex } = useQuesterStore.getState();
		const next = indexCollectionResponse(
			pathShapeIndex,
			requestPath,
			httpOutput,
		);
		useQuesterStore.setState({
			pathShapeIndex: next,
			pathIndexStatus: "idle",
		});
		schedulePathShapesPersist();
	});
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
	recentWorkspacePaths: string[];
	flows: FlowMeta[];
	requests: RequestMeta[];
	collections: string[];
	envs: string[];
	secretFiles: SecretFileMeta[];
	selectedEnv: string;
	/** Cached `{{env.*}}` keys for `selectedEnv` (when env tab is closed). */
	templateEnvKeys: string[];
	/** Cached env variable values for hover previews (never secrets). */
	templateEnvValues: Record<string, string | number | boolean>;
	/** Cached `{{secrets.*}}` keys for `selectedEnv` (when secrets tab is closed). */
	templateSecretKeys: string[];
	/** Learned JSON paths (keys only) for autocomplete. */
	pathShapeIndex: PathShapeIndex;
	pathIndexStatus: PathIndexStatus;
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
	/** Run state keyed by flow id (active flow drives Response/Logs UI). */
	runByFlowId: Record<string, FlowRunState>;
	/** Send state keyed by collection request path (per-tab isolation). */
	requestByPath: Record<string, RequestSendState>;
	consoleLines: string[];

	setActiveTabId: (tabId: string | null) => void;
	setSelectedEnv: (env: string) => void;
	refreshTemplateKeys: () => Promise<void>;
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
	clearLogs: () => void;
	showError: (message: string) => void;
	handleActivityView: (view: ActivityView) => void;
	openAppPreferences: () => void;
	openWorkspaceSettings: () => Promise<void>;
	updateWorkspaceSettingsManifest: (manifest: WorkspaceV1) => void;
	updateActiveFlowMeta: (meta: {
		name?: string;
		description?: string;
		http?: HttpSettingsV1;
	}) => void;
	openTab: (tab: EditorTab) => void;
	openResponseViewerTab: (
		snapshot: ResponseViewerSnapshot,
		sourceKey: string,
	) => void;
	applyNodeRunStatusEvent: (event: NodeRunStatusEvent) => void;
	refreshWorkspaceLists: (path: string) => Promise<{
		flowList: FlowMeta[];
		envList: string[];
		secretsList: SecretFileMeta[];
		requestList: RequestMeta[];
		collectionList: string[];
	}>;
	loadFlow: (flowId: string, workspace: string) => Promise<void>;
	loadEnvironment: (envName: string, workspace: string) => Promise<void>;
	loadSecretsFile: (envName: string, workspace: string) => Promise<void>;
	loadRequest: (requestPath: string, workspace: string) => Promise<void>;
	loadWorkspace: (path: string) => Promise<void>;
	openWorkspacePicker: () => Promise<void>;
	closeWorkspace: () => void;
	createWorkspaceViaPicker: () => Promise<void>;
	openSampleWorkspace: () => Promise<void>;
	openRecentWorkspace: (path: string) => Promise<void>;
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
	reorderTabs: (fromIndex: number, toIndex: number) => void;
	closeTabsToLeft: (tabId: string) => void;
	closeTabsToRight: (tabId: string) => void;
	saveActiveTab: (tabId?: string | null) => Promise<void>;
	createFlow: () => Promise<void>;
	createEnv: () => Promise<void>;
	createSecretsFile: () => Promise<void>;
	createCollection: () => Promise<void>;
	importCollection: () => Promise<void>;
	createRequest: (collection?: string) => Promise<void>;
	deleteRequest: (requestPath: string) => Promise<void>;
	addRequestToCanvas: (requestPath: string) => Promise<void>;
	renameFlow: (flowId: string) => Promise<void>;
	deleteFlow: (flowId: string) => Promise<void>;
	runFlow: () => Promise<void>;
	stopFlow: () => void;
	replayRunFromHistory: (runId: string) => void;
	sendRequest: () => Promise<void>;
};

export const useQuesterStore = create<QuesterState>((set, get) => ({
	workspacePath: "",
	workspaceName: "",
	recentWorkspacePaths: readRecentWorkspacePaths(),
	flows: [],
	requests: [],
	collections: [],
	envs: [],
	secretFiles: [],
	selectedEnv: "local",
	templateEnvKeys: [],
	templateEnvValues: {},
	templateSecretKeys: [],
	pathShapeIndex: emptyPathShapeIndex(),
	pathIndexStatus: "idle",
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
	runByFlowId: {},
	requestByPath: {},
	consoleLines: ["> Quester ready"],

	setActiveTabId: (tabId) =>
		set((s) => {
			if (s.activeTabId === tabId) return s;
			const tab = s.openTabs.find((t) => t.id === tabId);
			return {
				activeTabId: tabId,
				selectedNodeId: null,
				canvasDirty: Boolean(tab?.kind === "flow" && tab.dirty),
				...(tab?.kind === "flow" ? { inputJson: tab.inputJson } : {}),
			};
		}),
	setSelectedEnv: (env) => {
		const { selectedEnv } = get();
		if (selectedEnv === env) return;
		set({ selectedEnv: env });
		void get().refreshTemplateKeys();
	},
	refreshTemplateKeys: async () => {
		const { workspacePath, selectedEnv } = get();
		if (!workspacePath) {
			set({
				templateEnvKeys: [],
				templateEnvValues: {},
				templateSecretKeys: [],
			});
			return;
		}
		const [envResult, secretKeys] = await Promise.all([
			getQuesterClient()
				.loadEnvironment(workspacePath, selectedEnv)
				.catch(() => null),
			getQuesterClient()
				.listSecretNames(workspacePath, selectedEnv)
				.catch(() => []),
		]);
		set({
			templateEnvKeys: envResult ? Object.keys(envResult.variables) : [],
			templateEnvValues: envResult ? { ...envResult.variables } : {},
			templateSecretKeys: secretKeys,
		});
	},
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
	setInputJson: (json) => {
		let dirtied = false;
		set((s) => {
			const { activeTabId } = s;
			let parsed: unknown;
			let valid = false;
			try {
				parsed = JSON.parse(json) as unknown;
				valid = true;
			} catch {
				// Keep draft text; only persist valid JSON onto the input node.
			}

			let canvasDirty = s.canvasDirty;
			const openTabs = s.openTabs.map((t) => {
				if (t.id !== activeTabId || t.kind !== "flow") return t;
				let flow = t.flow;
				let dirty = t.dirty;
				if (valid) {
					const nextFlow = withInputNodeValue(flow, parsed);
					if (!flowJsonEqual(nextFlow, flow)) {
						flow = nextFlow;
						dirty = true;
						canvasDirty = true;
						dirtied = true;
					}
				}
				if (t.inputJson === json && flow === t.flow && dirty === t.dirty) {
					return t;
				}
				return { ...t, inputJson: json, flow, dirty };
			});

			return {
				inputJson: json,
				openTabs,
				...(canvasDirty !== s.canvasDirty ? { canvasDirty } : {}),
			};
		});
		if (dirtied) scheduleInspectorAutosave();
	},
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
	clearLogs: () =>
		set((s) => {
			const flowTab = s.openTabs.find((t) => t.id === s.activeTabId);
			if (flowTab?.kind !== "flow") return s;
			const flowId = flowTab.flowId;
			const prev = s.runByFlowId[flowId] ?? emptyFlowRunState();
			return {
				runByFlowId: patchFlowRun(s.runByFlowId, flowId, {
					runError: null,
					runResult: prev.runResult ? { ...prev.runResult, logs: [] } : null,
				}),
			};
		}),
	showError: (message) => {
		toast.error(message);
		set((s) => {
			const flowTab = s.openTabs.find((t) => t.id === s.activeTabId);
			const base = {
				panelTab: "logs" as const,
				panelOpen: true,
			};
			if (flowTab?.kind !== "flow") return base;
			return {
				...base,
				runByFlowId: patchFlowRun(s.runByFlowId, flowTab.flowId, {
					runError: message,
				}),
			};
		});
	},

	handleActivityView: (view) => {
		if (view === "settings") {
			get().openAppPreferences();
			return;
		}
		const { sidebarOpen, activityView } = get();
		if (sidebarOpen && activityView === view) {
			set({ sidebarOpen: false });
			return;
		}
		set({ activityView: view, sidebarOpen: true });
	},

	openAppPreferences: () => {
		get().openTab(createAppSettingsEditorTab());
	},

	openWorkspaceSettings: async () => {
		const { workspacePath, showError, openTab } = get();
		if (!workspacePath) {
			showError("Open a workspace first");
			return;
		}
		try {
			const manifest =
				await getQuesterClient().loadWorkspaceManifest(workspacePath);
			openTab(createWorkspaceSettingsEditorTab(manifest));
		} catch (err) {
			showError(
				err instanceof Error
					? err.message
					: "Failed to load workspace settings",
			);
		}
	},

	updateWorkspaceSettingsManifest: (manifest) => {
		set((s) => ({
			openTabs: s.openTabs.map((t) =>
				t.kind === "workspaceSettings" ? { ...t, manifest, dirty: true } : t,
			),
		}));
	},

	updateActiveFlowMeta: ({ name, description, http }) => {
		get().updateActiveFlow((flow) => ({
			...flow,
			...(name !== undefined ? { name: name || flow.id } : {}),
			...(description !== undefined
				? { description: description || undefined }
				: {}),
			...(http !== undefined
				? {
						settings: {
							...flow.settings,
							http,
						},
					}
				: {}),
		}));
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
				...(active?.kind === "flow" ? { inputJson: active.inputJson } : {}),
			};
		});
	},

	openResponseViewerTab: (snapshot, sourceKey) => {
		get().openTab(createResponseViewerTab(snapshot, sourceKey));
	},

	applyNodeRunStatusEvent: (event) => {
		const slot = get().runByFlowId[event.flowId] ?? emptyFlowRunState();
		if (event.runId !== slot.activeRunId) return;
		const next = applyNodeStatusEvent(slot.nodeStatuses, event);
		if (next === slot.nodeStatuses) return;
		set((s) => ({
			runByFlowId: patchFlowRun(s.runByFlowId, event.flowId, {
				nodeStatuses: next,
			}),
		}));
	},

	refreshWorkspaceLists: async (path) => {
		const [flowList, envList, secretsList, requestList, collectionList] =
			await Promise.all([
				getQuesterClient().listFlows(path),
				getQuesterClient().listEnvs(path),
				getQuesterClient().listSecretFiles(path),
				getQuesterClient().listCollectionRequests(path),
				getQuesterClient().listCollections(path),
			]);
		set({
			flows: flowList,
			envs: envList,
			secretFiles: secretsList,
			requests: requestList,
			collections: collectionList,
		});
		return { flowList, envList, secretsList, requestList, collectionList };
	},

	loadFlow: async (flowId, workspace) => {
		const tabId = flowTabId(flowId);
		const existing = get().openTabs.find((t) => t.id === tabId);
		if (existing) {
			set({
				activeTabId: tabId,
				selectedNodeId: null,
				canvasDirty: Boolean(existing.kind === "flow" && existing.dirty),
				...(existing.kind === "flow" ? { inputJson: existing.inputJson } : {}),
			});
			return;
		}
		const flow = await getQuesterClient().loadFlow(flowId, workspace);
		get().openTab(createFlowEditorTab(flow));
	},

	loadEnvironment: async (envName, workspace) => {
		const tabId = envTabId(envName);
		const existing = get().openTabs.find((t) => t.id === tabId);
		if (existing) {
			set({ activeTabId: tabId });
			return;
		}
		const environment = await getQuesterClient().loadEnvironment(
			workspace,
			envName,
		);
		get().openTab(createEnvEditorTab(environment));
	},

	loadSecretsFile: async (envName, workspace) => {
		const tabId = secretsTabId(envName);
		const existing = get().openTabs.find((t) => t.id === tabId);
		if (existing) {
			set({ activeTabId: tabId });
			return;
		}
		const secrets = await getQuesterClient().loadSecretsFile(
			workspace,
			envName,
		);
		get().openTab(createSecretsEditorTab(envName, secrets));
	},

	loadRequest: async (requestPath, workspace) => {
		const tabId = requestTabId(requestPath);
		const existing = get().openTabs.find((t) => t.id === tabId);
		if (existing) {
			set({
				activeTabId: tabId,
				selectedNodeId: null,
			});
			return;
		}
		const request = await getQuesterClient().loadRequest(
			workspace,
			requestPath,
		);
		get().openTab(createRequestEditorTab(requestPath, request));
	},

	loadWorkspace: async (path) => {
		const { refreshWorkspaceLists, loadFlow, appendConsole, runByFlowId } =
			get();
		cancelInFlightRuns(runByFlowId);
		set({
			isLoading: true,
			loadError: null,
			runByFlowId: {},
			requestByPath: {},
			openTabs: [],
			activeTabId: null,
			selectedNodeId: null,
			canvasDirty: false,
			pathShapeIndex: emptyPathShapeIndex(),
			pathIndexStatus: "idle",
		});
		try {
			const summary = await getQuesterClient().openWorkspaceSummary(path);
			const { flowList, envList } = await refreshWorkspaceLists(path);
			const env = envList[0] ?? "local";
			set({
				workspacePath: path,
				workspaceName: summary.name,
				selectedEnv: env,
				recentWorkspacePaths: rememberWorkspacePath(path),
			});
			hydratePathShapes(path);
			await get().refreshTemplateKeys();
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
			const path = await getQuesterClient().pickWorkspaceFolder();
			if (path) await get().loadWorkspace(path);
		} catch (err) {
			set({
				loadError:
					err instanceof Error ? err.message : "Failed to open workspace",
			});
		}
	},

	closeWorkspace: () => {
		cancelInFlightRuns(get().runByFlowId);
		clearLastWorkspacePath();
		set({
			workspacePath: "",
			workspaceName: "",
			flows: [],
			requests: [],
			collections: [],
			envs: [],
			secretFiles: [],
			openTabs: [],
			activeTabId: null,
			selectedNodeId: null,
			canvasDirty: false,
			pathShapeIndex: emptyPathShapeIndex(),
			pathIndexStatus: "idle",
			runByFlowId: {},
			requestByPath: {},
			loadError: null,
			isLoading: false,
		});
	},

	createWorkspaceViaPicker: async () => {
		try {
			const path = await getQuesterClient().pickWorkspaceFolder();
			if (!path) return;
			await getQuesterClient().scaffoldWorkspace(path);
			await get().loadWorkspace(path);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to create workspace";
			set({ loadError: message });
			toast.error(message);
		}
	},

	openSampleWorkspace: async () => {
		try {
			const path = await getQuesterClient().getDefaultWorkspace();
			await get().loadWorkspace(path);
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Failed to open sample workspace";
			set({ loadError: message });
			toast.error(message);
		}
	},

	openRecentWorkspace: async (path) => {
		await get().loadWorkspace(path);
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
		const { activeTabId, selectedEnv } = get();
		if (!activeTabId) return;
		const keys = rows.map((r) => r.key.trim()).filter(Boolean);
		const values = rowsToEnvVariables(rows);
		set((s) => {
			const tab = s.openTabs.find((t) => t.id === activeTabId);
			const matchesSelected =
				tab?.kind === "env" && tab.envName === selectedEnv;
			return {
				openTabs: s.openTabs.map((t) =>
					t.id === activeTabId && t.kind === "env"
						? {
								...t,
								rows,
								environment: {
									...t.environment,
									variables: values,
								},
								dirty: true,
							}
						: t,
				),
				...(matchesSelected
					? { templateEnvKeys: keys, templateEnvValues: values }
					: {}),
			};
		});
	},

	handleSecretRowsChange: (rows) => {
		const { activeTabId, selectedEnv } = get();
		if (!activeTabId) return;
		const keys = rows.map((r) => r.key.trim()).filter(Boolean);
		set((s) => {
			const tab = s.openTabs.find((t) => t.id === activeTabId);
			const matchesSelected =
				tab?.kind === "secrets" && tab.envName === selectedEnv;
			return {
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
				...(matchesSelected ? { templateSecretKeys: keys } : {}),
			};
		});
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
			const request = await getQuesterClient().loadRequest(
				workspacePath,
				requestPath,
			);
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
		set({ canvasDirty: true });
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
			const ok = confirmDialog(
				`Close ${editorTabLabel(tab)} with unsaved changes?`,
			);
			if (!ok) return;
		}
		const remaining = openTabs.filter((t) => t.id !== tabId);
		const nextActiveId =
			activeTabId === tabId ? (remaining[0]?.id ?? null) : activeTabId;
		const nextActive = remaining.find((t) => t.id === nextActiveId);
		set((s) => {
			let requestByPath = s.requestByPath;
			if (tab?.kind === "request") {
				const { [tab.requestPath]: _dropped, ...rest } = s.requestByPath;
				requestByPath = rest;
			}
			return {
				openTabs: remaining,
				activeTabId: nextActiveId,
				selectedNodeId: activeTabId === tabId ? null : s.selectedNodeId,
				requestByPath,
				...(nextActive?.kind === "flow"
					? { inputJson: nextActive.inputJson }
					: {}),
			};
		});
	},

	reorderTabs: (fromIndex, toIndex) => {
		if (fromIndex === toIndex) return;
		const { openTabs } = get();
		if (
			fromIndex < 0 ||
			toIndex < 0 ||
			fromIndex >= openTabs.length ||
			toIndex >= openTabs.length
		) {
			return;
		}
		const next = [...openTabs];
		const [moved] = next.splice(fromIndex, 1);
		if (!moved) return;
		next.splice(toIndex, 0, moved);
		set({ openTabs: next });
	},

	closeTabsToLeft: (tabId) => {
		const { openTabs, closeTab } = get();
		const idx = openTabs.findIndex((t) => t.id === tabId);
		if (idx <= 0) return;
		for (const tab of openTabs.slice(0, idx)) {
			const before = get().openTabs.length;
			closeTab(tab.id);
			if (get().openTabs.length === before) return;
		}
	},

	closeTabsToRight: (tabId) => {
		const { openTabs, closeTab } = get();
		const idx = openTabs.findIndex((t) => t.id === tabId);
		if (idx < 0 || idx >= openTabs.length - 1) return;
		for (const tab of openTabs.slice(idx + 1)) {
			const before = get().openTabs.length;
			closeTab(tab.id);
			if (get().openTabs.length === before) return;
		}
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
				const invalid = flowHasInvalidNodeData(tab.flow);
				if (invalid.invalid) {
					// Keep dirty; skip disk write until fields are valid.
					// Inspector shows field errors — do not surface as a run-level alert.
					set((s) => {
						const slot = s.runByFlowId[tab.flowId];
						const clearValidationAlert =
							slot?.runError?.includes("Flow validation failed") ||
							slot?.runError?.includes("fix the invalid fields");
						return {
							selectedNodeId: invalid.nodeId,
							rightPanelOpen: true,
							rightPanelTab: "inspector" as const,
							...(clearValidationAlert
								? {
										runByFlowId: patchFlowRun(s.runByFlowId, tab.flowId, {
											runError: null,
										}),
									}
								: {}),
						};
					});
					return;
				}
				const saved = await getQuesterClient().saveFlow(
					tab.flow,
					workspacePath,
				);
				set((s) => {
					const nextId = flowTabId(saved.id);
					return {
						openTabs: s.openTabs.map((t) =>
							t.id === tab.id && t.kind === "flow"
								? {
										...t,
										flowId: saved.id,
										flow: saved,
										inputJson: t.inputJson,
										dirty: false,
										id: nextId,
									}
								: t,
						),
						activeTabId: activeTabId === tab.id ? nextId : s.activeTabId,
						canvasDirty: false,
						...(activeTabId === tab.id ? { inputJson: tab.inputJson } : {}),
					};
				});
				appendConsole(`Saved flow ${saved.id}`);
			} else if (tab.kind === "env") {
				const saved = await getQuesterClient().saveEnvironment(
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
				if (saved.name === get().selectedEnv) {
					await get().refreshTemplateKeys();
				}
			} else if (tab.kind === "secrets") {
				const saved = await getQuesterClient().saveSecretsFile(
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
				if (tab.envName === get().selectedEnv) {
					await get().refreshTemplateKeys();
				}
			} else if (tab.kind === "request") {
				const saved = await getQuesterClient().saveRequest(
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
			} else if (tab.kind === "workspaceSettings") {
				const saved = await getQuesterClient().saveWorkspaceManifest(
					workspacePath,
					tab.manifest,
				);
				set((s) => ({
					workspaceName: saved.name,
					openTabs: s.openTabs.map((t) =>
						t.id === tab.id && t.kind === "workspaceSettings"
							? { ...t, manifest: saved, dirty: false }
							: t,
					),
				}));
				appendConsole(`Saved workspace ${saved.name}`);
			} else if (tab.kind === "appSettings") {
				return;
			}
			await refreshWorkspaceLists(workspacePath);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Save failed";
			if (
				message.includes("Flow validation failed") ||
				message.includes("fix the invalid fields")
			) {
				const match = message.match(/Select (\S+) in the inspector/);
				set((s) => ({
					...(match?.[1]
						? {
								selectedNodeId: match[1],
								rightPanelOpen: true,
								rightPanelTab: "inspector" as const,
							}
						: {}),
					...(tab.kind === "flow" &&
					s.runByFlowId[tab.flowId]?.runError?.includes("Flow validation")
						? {
								runByFlowId: patchFlowRun(s.runByFlowId, tab.flowId, {
									runError: null,
								}),
							}
						: {}),
				}));
				toast.warning("Fix invalid node fields in the inspector");
				return;
			}
			showError(message);
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
		const name = await promptName({
			title: "New flow",
			label: "Name",
			confirmLabel: "Create",
		});
		if (!name) return;
		const flowId = slugifyName(name);
		try {
			const flow = await getQuesterClient().createFlow(
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
		const name = await promptName({
			title: "New environment",
			label: "Name",
			confirmLabel: "Create",
		});
		if (!name) return;
		const envName = slugifyName(name);
		try {
			const environment = await getQuesterClient().createEnvironment(
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
		const name = await promptName({
			title: "New secrets file",
			label: "Environment name",
			defaultValue: envs[0] ?? "local",
			confirmLabel: "Create",
		});
		if (!name) return;
		const envName = slugifyName(name);
		try {
			const secrets = await getQuesterClient().createSecretsFile(
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
		const name = await promptName({
			title: "Rename flow",
			label: "Name",
			defaultValue: currentName,
			confirmLabel: "Rename",
		});
		if (!name || name === currentName) return;

		const newId = slugifyName(name);
		try {
			const saved = await getQuesterClient().renameFlow(
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
			const saveFirst = confirmDialog(
				`${meta?.name ?? flowId} has unsaved changes. Save before deleting?`,
			);
			if (saveFirst) await saveActiveTab(tabId);
		}
		const ok = confirmDialog(`Delete ${meta?.name ?? flowId}?`);
		if (!ok) return;
		try {
			await getQuesterClient().deleteFlow(workspacePath, flowId);
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
			saveActiveTab,
			canvasDirty,
			runByFlowId,
		} = get();
		const activeTab = openTabs.find((t) => t.id === activeTabId);
		const activeFlowTab = activeTab?.kind === "flow" ? activeTab : null;
		if (!activeFlowTab || !workspacePath) return;

		const flowId = activeFlowTab.flowId;
		if (runByFlowId[flowId]?.isRunning) return;

		const invalid = flowHasInvalidNodeData(activeFlowTab.flow);
		if (invalid.invalid) {
			set({
				selectedNodeId: invalid.nodeId,
				rightPanelOpen: true,
				rightPanelTab: "inspector",
			});
			toast.warning("Fix invalid node fields in the inspector before running");
			return;
		}

		if (activeFlowTab.dirty || canvasDirty) {
			await saveActiveTab(activeFlowTab.id);
		}

		let input: unknown;
		try {
			input = JSON.parse(inputJson);
			set({ inputError: null });
		} catch {
			set({ inputError: "Invalid JSON input", playgroundOpen: true });
			return;
		}

		const runId = crypto.randomUUID();
		const nodeIds = activeFlowTab.flow.nodes.map((n) => n.id);
		set((s) => ({
			runByFlowId: patchFlowRun(s.runByFlowId, flowId, {
				isRunning: true,
				runError: null,
				runResult: null,
				activeRunId: runId,
				nodeStatuses: initNodeStatuses(nodeIds),
			}),
			panelOpen: true,
			panelTab: "logs",
			rightPanelOpen: true,
			rightPanelTab: "response",
		}));
		appendConsole(`Run started: ${flowId}`);

		try {
			const result = await getQuesterClient().executeFlowRpc({
				flowId,
				workspace: workspacePath,
				runId,
				env: selectedEnv,
				input,
			});
			const slot = get().runByFlowId[flowId] ?? emptyFlowRunState();
			if (slot.activeRunId !== runId) return;

			const reconciled = reconcileNodeStatuses(
				nodeIds,
				result.steps,
				slot.nodeStatuses,
			);
			set((s) => ({
				runByFlowId: patchFlowRun(s.runByFlowId, flowId, {
					runResult: result,
					runError: result.error ?? null,
					nodeStatuses: reconciled,
				}),
			}));
			appendRunHistory({
				flowId,
				runId,
				ts: Date.now(),
				ok: !result.error && !result.cancelled,
				error: result.error,
				result: truncateResultForHistory(result),
			});
			scheduleIndexNodeOutputs(result.nodeOutputs);
			if (result.cancelled) {
				toast.warning("Run cancelled");
				appendConsole("Run cancelled");
			} else if (result.error) {
				toast.error(result.error);
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
				toast.success(`Run finished: ${flowId}`);
				appendConsole("Run finished");
			}
		} catch (err) {
			void getQuesterClient().cancelFlowRun({ runId });
			const message =
				err instanceof Error
					? [err.message, err.stack].filter(Boolean).join("\n")
					: "Flow execution failed";
			const short =
				err instanceof Error ? err.message : "Flow execution failed";
			toast.error(short);
			const slot = get().runByFlowId[flowId] ?? emptyFlowRunState();
			if (slot.activeRunId === runId) {
				const reconciled = reconcileNodeStatuses(
					nodeIds,
					[],
					slot.nodeStatuses,
				);
				set((s) => ({
					runByFlowId: patchFlowRun(s.runByFlowId, flowId, {
						runError: err instanceof Error ? err.message : message,
						nodeStatuses: reconciled,
					}),
				}));
			}
			appendConsole(message);
		} finally {
			set((s) => {
				const slot = s.runByFlowId[flowId];
				if (!slot || slot.activeRunId !== runId) return s;
				return {
					runByFlowId: patchFlowRun(s.runByFlowId, flowId, {
						isRunning: false,
					}),
				};
			});
		}
	},

	stopFlow: () => {
		const { openTabs, activeTabId, runByFlowId } = get();
		const activeTab = openTabs.find((t) => t.id === activeTabId);
		if (activeTab?.kind !== "flow") return;
		const flowId = activeTab.flowId;
		const slot = runByFlowId[flowId];
		if (!slot?.isRunning || !slot.activeRunId) return;
		void getQuesterClient().cancelFlowRun({ runId: slot.activeRunId });
	},

	replayRunFromHistory: (runId) => {
		const { openTabs, activeTabId } = get();
		const activeTab = openTabs.find((t) => t.id === activeTabId);
		if (activeTab?.kind !== "flow") return;
		const flowId = activeTab.flowId;
		const entry = findRunHistoryEntry(flowId, runId);
		if (!entry) return;
		set((s) => ({
			runByFlowId: patchFlowRun(s.runByFlowId, flowId, {
				runResult: entry.result,
				runError: entry.error ?? entry.result.error ?? null,
				isRunning: false,
			}),
			rightPanelOpen: true,
			rightPanelTab: "response",
			panelOpen: true,
			panelTab: "logs",
		}));
		scheduleIndexNodeOutputs(entry.result.nodeOutputs ?? {});
	},

	createCollection: async () => {
		const { workspacePath, refreshWorkspaceLists, appendConsole, showError } =
			get();
		if (!workspacePath) return;
		const name = await promptName({
			title: "New collection",
			label: "Name",
			confirmLabel: "Create",
		});
		if (!name) return;
		const folder = slugifyName(name);
		if (!folder) {
			showError("Invalid collection name");
			return;
		}
		try {
			await getQuesterClient().createCollection(workspacePath, folder);
			await refreshWorkspaceLists(workspacePath);
			appendConsole(`Created collection ${folder}`);
			set({ activityView: "collections", sidebarOpen: true });
		} catch (err) {
			showError(
				err instanceof Error ? err.message : "Create collection failed",
			);
		}
	},

	importCollection: async () => {
		const { workspacePath, refreshWorkspaceLists, appendConsole, showError } =
			get();
		if (!workspacePath) return;
		try {
			const filePath = await getQuesterClient().pickCollectionFile();
			if (!filePath) return;
			const result = await getQuesterClient().importCollection(
				workspacePath,
				filePath,
			);
			await refreshWorkspaceLists(workspacePath);
			for (const path of result.imported) {
				appendConsole(`Imported request ${path}`);
			}
			if (result.imported.length > 0) {
				toast.success(
					`Imported ${result.imported.length} request${result.imported.length === 1 ? "" : "s"}`,
				);
			} else {
				toast.info("No requests found in collection");
			}
			set({ activityView: "collections", sidebarOpen: true });
		} catch (err) {
			showError(
				err instanceof Error ? err.message : "Import collection failed",
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
		const name = await promptName({
			title: "New request",
			label: "Name",
			confirmLabel: "Create",
		});
		if (!name) return;
		const slug = slugifyName(name);
		const requestPath = collection ? `${collection}/${slug}` : slug;
		try {
			const request = await getQuesterClient().createRequest(
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
		const ok = confirmDialog(`Delete request ${requestPath}?`);
		if (!ok) return;
		try {
			await getQuesterClient().deleteRequest(workspacePath, requestPath);
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

		const requestPath = tab.requestPath;
		if (get().requestByPath[requestPath]?.isSending) return;

		if (tab.dirty) {
			await saveActiveTab(tab.id);
		}

		const sendId = crypto.randomUUID();
		set((s) => ({
			requestByPath: patchRequestSend(s.requestByPath, requestPath, {
				isSending: true,
				error: null,
				result: null,
				sendId,
			}),
		}));
		appendConsole(`Send request: ${requestPath}`);

		try {
			const result = await getQuesterClient().executeRequestRpc({
				requestPath,
				workspace: workspacePath,
				env: selectedEnv,
			});
			const slot = get().requestByPath[requestPath] ?? emptyRequestSendState();
			if (slot.sendId !== sendId) return;

			set((s) => ({
				requestByPath: patchRequestSend(s.requestByPath, requestPath, {
					result,
					error: result.error ?? null,
				}),
			}));
			scheduleIndexCollectionResponse(requestPath, result.httpOutput);
			if (result.error) {
				appendConsole(`Request failed: ${result.error}`);
			} else {
				appendConsole("Request finished");
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Request execution failed";
			const slot = get().requestByPath[requestPath] ?? emptyRequestSendState();
			if (slot.sendId === sendId) {
				set((s) => ({
					requestByPath: patchRequestSend(s.requestByPath, requestPath, {
						error: message,
					}),
				}));
			}
			appendConsole(message);
		} finally {
			set((s) => {
				const slot = s.requestByPath[requestPath];
				if (!slot || slot.sendId !== sendId) return s;
				return {
					requestByPath: patchRequestSend(s.requestByPath, requestPath, {
						isSending: false,
					}),
				};
			});
		}
	},
}));
