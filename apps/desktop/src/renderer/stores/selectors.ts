import type { KeyValueRow } from "@/components/KeyValueEditor.js";
import { rowsToEnvVariables } from "@/components/KeyValueEditor.js";
import { type EditorTab, editorTabLabel } from "@/lib/editorTabs.js";
import {
	contractPathsForType,
	mergeContractAndLearned,
} from "@/lib/nodeOutputContracts.js";
import {
	collectJsonPaths,
	nodeSourceKey,
	pathsForSource,
} from "@/lib/pathShapes.js";
import {
	type TemplateCompletionContext,
	inputKeysFromJson,
	varKeysFromNodes,
	varValuesFromNodes,
} from "@/lib/templates.js";
import type { NodeRunStatus } from "../../shared/rpc.js";
import {
	APP_CONSOLE_KEY,
	DEFAULT_CONSOLE_LINES,
	type FlowRunState,
	type QuesterState,
	type RequestSendState,
	STABLE_EMPTY_FLOW_RUN,
	STABLE_EMPTY_REQUEST_SEND,
} from "./quester-store.js";

function keysFromRows(rows: KeyValueRow[]): string[] {
	return rows.map((r) => r.key.trim()).filter(Boolean);
}

export function selectActiveTab(state: QuesterState): EditorTab | null {
	return state.openTabs.find((t) => t.id === state.activeTabId) ?? null;
}

export function selectActiveFlowTab(state: QuesterState) {
	const tab = selectActiveTab(state);
	return tab?.kind === "flow" ? tab : null;
}

export function selectActiveRequestTab(state: QuesterState) {
	const tab = selectActiveTab(state);
	return tab?.kind === "request" ? tab : null;
}

export function selectFlowRun(
	state: QuesterState,
	flowId: string | null | undefined,
): FlowRunState {
	if (!flowId) return STABLE_EMPTY_FLOW_RUN;
	return state.runByFlowId[flowId] ?? STABLE_EMPTY_FLOW_RUN;
}

export function selectActiveFlowRun(state: QuesterState): FlowRunState {
	return selectFlowRun(state, selectActiveFlowTab(state)?.flowId);
}

export function selectRequestSend(
	state: QuesterState,
	requestPath: string | null | undefined,
): RequestSendState {
	if (!requestPath) return STABLE_EMPTY_REQUEST_SEND;
	return state.requestByPath[requestPath] ?? STABLE_EMPTY_REQUEST_SEND;
}

export function selectActiveRequestSend(state: QuesterState): RequestSendState {
	return selectRequestSend(state, selectActiveRequestTab(state)?.requestPath);
}

/** Count of flows currently running (status bar). */
export function selectRunningFlowCount(state: QuesterState): number {
	let runningFlows = 0;
	for (const slot of Object.values(state.runByFlowId)) {
		if (slot.isRunning) runningFlows += 1;
	}
	return runningFlows;
}

/** Count of collection requests currently sending (status bar). */
export function selectSendingRequestCount(state: QuesterState): number {
	let sendingRequests = 0;
	for (const slot of Object.values(state.requestByPath)) {
		if (slot.isSending) sendingRequests += 1;
	}
	return sendingRequests;
}

/** Counts of in-flight work across all tabs (tests / non-hook use). */
export function selectInFlightActivity(state: QuesterState): {
	runningFlows: number;
	sendingRequests: number;
} {
	return {
		runningFlows: selectRunningFlowCount(state),
		sendingRequests: selectSendingRequestCount(state),
	};
}

export function selectDirtyTabIds(state: QuesterState): string[] {
	return state.openTabs.filter((t) => t.dirty).map((t) => t.id);
}

export function selectAnyDirty(state: QuesterState): boolean {
	return state.openTabs.some((t) => t.dirty);
}

export function selectStatusLabel(state: QuesterState): string {
	const tab = selectActiveTab(state);
	return tab != null ? editorTabLabel(tab) : "No file";
}

export function selectCanRun(state: QuesterState): boolean {
	return Boolean(
		selectActiveFlowTab(state) &&
			state.workspacePath &&
			!state.isLoading &&
			!selectActiveFlowRun(state).isRunning,
	);
}

export function selectRightPanelVisible(state: QuesterState): boolean {
	return state.rightPanelOpen && Boolean(selectActiveFlowTab(state));
}

/** First inbound edge source for a node (predecessor heuristic). */
export function predecessorNodeId(
	edges: ReadonlyArray<{ source: string; target: string }>,
	nodeId: string,
): string | null {
	const edge = edges.find((e) => e.target === nodeId);
	return edge?.source ?? null;
}

function pathsForNode(
	state: QuesterState,
	nodeId: string,
	nodeType: string | undefined,
): string[] {
	const learned = pathsForSource(state.pathShapeIndex, nodeSourceKey(nodeId));
	const contract = nodeType ? contractPathsForType(nodeType) : [];
	const fromRun = selectActiveFlowRun(state).runResult?.nodeOutputs?.[nodeId];
	const fromRunPaths = fromRun !== undefined ? collectJsonPaths(fromRun) : [];
	return mergeContractAndLearned(contract, [...learned, ...fromRunPaths]);
}

/** Autocomplete sources for `{{...}}` templates, from the active flow + env. */
export function selectTemplateContext(
	state: QuesterState,
): TemplateCompletionContext {
	const flowTab = selectActiveFlowTab(state);
	const nodes = flowTab?.flow.nodes ?? [];
	const edges = flowTab?.flow.edges ?? [];
	const envName = state.selectedEnv;
	const envTab = state.openTabs.find(
		(t): t is Extract<EditorTab, { kind: "env" }> =>
			t.kind === "env" && t.envName === envName,
	);
	const secretsTab = state.openTabs.find(
		(t): t is Extract<EditorTab, { kind: "secrets" }> =>
			t.kind === "secrets" && t.envName === envName,
	);

	const inputValue = (() => {
		try {
			return JSON.parse(state.inputJson) as unknown;
		} catch {
			return undefined;
		}
	})();

	const inputPaths =
		inputValue !== undefined ? collectJsonPaths(inputValue) : [];

	const nodePaths: Record<string, string[]> = {};
	for (const node of nodes) {
		nodePaths[node.id] = pathsForNode(state, node.id, node.type);
	}

	const selectedId = state.selectedNodeId;
	const predId = selectedId ? predecessorNodeId(edges, selectedId) : null;
	const predNode = predId ? nodes.find((n) => n.id === predId) : undefined;
	const previousPaths = predId
		? pathsForNode(state, predId, predNode?.type)
		: [];
	const jmesPaths =
		previousPaths.length > 0
			? previousPaths
			: selectedId
				? pathsForNode(
						state,
						selectedId,
						nodes.find((n) => n.id === selectedId)?.type,
					)
				: mergeContractAndLearned(contractPathsForType("http"), []);

	const envValues = envTab
		? rowsToEnvVariables(envTab.rows)
		: state.templateEnvValues;

	return {
		nodeIds: nodes.map((n) => n.id),
		inputKeys: inputKeysFromJson(state.inputJson),
		inputPaths,
		varKeys: varKeysFromNodes(nodes),
		envKeys: envTab ? keysFromRows(envTab.rows) : state.templateEnvKeys,
		envValues,
		secretKeys: secretsTab
			? keysFromRows(secretsTab.rows)
			: state.templateSecretKeys,
		nodePaths,
		jmesPaths,
		previousPaths,
		inputValue,
		varValues: varValuesFromNodes(nodes),
		nodeOutputs: selectActiveFlowRun(state).runResult?.nodeOutputs ?? {},
	};
}

export function selectNodeRunStatus(
	state: QuesterState,
	nodeId: string,
	flowId?: string | null,
): NodeRunStatus | undefined {
	const activeFlow = selectActiveFlowTab(state);
	const resolvedFlowId = flowId ?? activeFlow?.flowId ?? null;
	if (!resolvedFlowId) return undefined;
	return selectFlowRun(state, resolvedFlowId).nodeStatuses[nodeId];
}

const STABLE_DEFAULT_CONSOLE: string[] = [...DEFAULT_CONSOLE_LINES];

/** Console lines for the active flow tab, or the app bucket when none. */
export function selectActiveConsoleLines(state: QuesterState): string[] {
	const flowId = selectActiveFlowTab(state)?.flowId;
	const key = flowId ?? APP_CONSOLE_KEY;
	return state.consoleByFlowId[key] ?? STABLE_DEFAULT_CONSOLE;
}
