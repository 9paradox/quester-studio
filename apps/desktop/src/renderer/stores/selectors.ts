import type { KeyValueRow } from "@/components/KeyValueEditor.js";
import { type EditorTab, editorTabLabel } from "@/lib/editorTabs.js";
import {
	type TemplateCompletionContext,
	inputKeysFromJson,
	varKeysFromNodes,
} from "@/lib/templates.js";
import type { NodeRunStatus } from "../../shared/rpc.js";
import type { QuesterState } from "./quester-store.js";

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
		selectActiveFlowTab(state) && state.workspacePath && !state.isLoading,
	);
}

export function selectRightPanelVisible(state: QuesterState): boolean {
	return state.rightPanelOpen && Boolean(selectActiveFlowTab(state));
}

/** Autocomplete sources for `{{...}}` templates, from the active flow + env. */
export function selectTemplateContext(
	state: QuesterState,
): TemplateCompletionContext {
	const flowTab = selectActiveFlowTab(state);
	const nodes = flowTab?.flow.nodes ?? [];
	const envName = state.selectedEnv;
	const envTab = state.openTabs.find(
		(t): t is Extract<EditorTab, { kind: "env" }> =>
			t.kind === "env" && t.envName === envName,
	);
	const secretsTab = state.openTabs.find(
		(t): t is Extract<EditorTab, { kind: "secrets" }> =>
			t.kind === "secrets" && t.envName === envName,
	);
	return {
		nodeIds: nodes.map((n) => n.id),
		inputKeys: inputKeysFromJson(state.inputJson),
		varKeys: varKeysFromNodes(nodes),
		envKeys: envTab ? keysFromRows(envTab.rows) : state.templateEnvKeys,
		secretKeys: secretsTab
			? keysFromRows(secretsTab.rows)
			: state.templateSecretKeys,
	};
}

export function selectNodeRunStatus(
	state: QuesterState,
	nodeId: string,
	flowId?: string | null,
): NodeRunStatus | undefined {
	const activeFlow = selectActiveFlowTab(state);
	const resolvedFlowId = flowId ?? activeFlow?.flowId ?? null;
	if (!resolvedFlowId || state.runFlowId !== resolvedFlowId) return undefined;
	return state.nodeStatuses[nodeId];
}
