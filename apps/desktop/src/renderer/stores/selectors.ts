import type { KeyValueRow } from "@/components/KeyValueEditor.js";
import { recordToRows } from "@/components/KeyValueEditor.js";
import { type EditorTab, editorTabLabel } from "@/lib/editorTabs.js";
import type { QuesterState } from "./quester-store.js";

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

export function selectEnvRows(state: QuesterState): KeyValueRow[] {
	const tab = selectActiveTab(state);
	if (tab?.kind !== "env") return [];
	return recordToRows(tab.environment.variables);
}

export function selectSecretRows(state: QuesterState): KeyValueRow[] {
	const tab = selectActiveTab(state);
	if (tab?.kind !== "secrets") return [];
	return recordToRows(tab.secrets.secrets);
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
