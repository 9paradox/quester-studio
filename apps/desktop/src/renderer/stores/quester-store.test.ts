import { beforeAll, describe, expect, mock, test } from "bun:test";
import {
	createEnvEditorTab,
	createFlowEditorTab,
	createSecretsEditorTab,
	flowTabId,
} from "@/lib/editorTabs.js";
import type { EnvironmentV1, FlowV1, SecretsV1 } from "@quester/schema";
import type { useQuesterStore as UseQuesterStore } from "./quester-store.js";
import {
	selectActiveFlowTab,
	selectActiveTab,
	selectAnyDirty,
	selectCanRun,
	selectDirtyTabIds,
} from "./selectors.js";
import { slugifyName } from "./slugify.js";

mock.module("@/lib/electrobun.js", () => ({
	desktopRpc: {},
}));

const sampleFlow: FlowV1 = {
	version: "v1",
	id: "demo-flow",
	name: "Demo",
	nodes: [],
	edges: [],
};

let useQuesterStore: typeof UseQuesterStore;

beforeAll(async () => {
	({ useQuesterStore } = await import("./quester-store.js"));
});

function resetStore() {
	useQuesterStore.setState({
		workspacePath: "",
		workspaceName: "",
		flows: [],
		envs: [],
		secretFiles: [],
		selectedEnv: "local",
		isLoading: false,
		loadError: null,
		openTabs: [],
		activeTabId: null,
		selectedNodeId: null,
		runResult: null,
		runError: null,
		isRunning: false,
	});
}

describe("slugifyName", () => {
	test("lowercases and hyphenates", () => {
		expect(slugifyName("My Flow Name")).toBe("my-flow-name");
	});

	test("falls back when empty", () => {
		expect(slugifyName("   ")).toBe("item");
	});
});

describe("useQuesterStore", () => {
	test("openTab activates tab and clears node selection for flows", () => {
		resetStore();
		useQuesterStore.setState({ selectedNodeId: "node-1" });
		const tab = createFlowEditorTab(sampleFlow);
		useQuesterStore.getState().openTab(tab);

		const state = useQuesterStore.getState();
		expect(state.openTabs).toHaveLength(1);
		expect(state.activeTabId).toBe(flowTabId("demo-flow"));
		expect(state.selectedNodeId).toBeNull();
	});

	test("closeTab removes tab and picks next active tab", () => {
		resetStore();
		const tabA = createFlowEditorTab({ ...sampleFlow, id: "a", name: "A" });
		const tabB = createFlowEditorTab({ ...sampleFlow, id: "b", name: "B" });
		useQuesterStore.getState().openTab(tabA);
		useQuesterStore.getState().openTab(tabB);
		useQuesterStore.getState().closeTab(flowTabId("b"));

		const state = useQuesterStore.getState();
		expect(state.openTabs).toHaveLength(1);
		expect(state.activeTabId).toBe(flowTabId("a"));
	});

	test("setZoom skips update when value unchanged", () => {
		resetStore();
		useQuesterStore.setState({ zoom: 1 });
		const before = useQuesterStore.getState();
		before.setZoom(1);
		expect(useQuesterStore.getState()).toBe(before);
	});

	test("handleGraphChange skips update when graph unchanged", () => {
		resetStore();
		const tab = createFlowEditorTab(sampleFlow);
		useQuesterStore.setState({
			openTabs: [tab],
			activeTabId: tab.id,
		});
		const before = useQuesterStore.getState();
		before.handleGraphChange([], []);
		expect(useQuesterStore.getState()).toBe(before);
	});

	test("handleActivityView toggles sidebar when same view clicked", () => {
		resetStore();
		useQuesterStore.setState({
			activityView: "flows",
			sidebarOpen: true,
		});
		useQuesterStore.getState().handleActivityView("flows");
		expect(useQuesterStore.getState().sidebarOpen).toBe(false);

		useQuesterStore.getState().handleActivityView("envs");
		expect(useQuesterStore.getState().activityView).toBe("envs");
		expect(useQuesterStore.getState().sidebarOpen).toBe(true);
	});

	test("handleEnvRowsChange keeps empty draft rows", () => {
		resetStore();
		const environment: EnvironmentV1 = {
			version: "v1",
			name: "local",
			variables: { API_BASE: "http://localhost" },
		};
		const tab = createEnvEditorTab(environment);
		useQuesterStore.setState({ openTabs: [tab], activeTabId: tab.id });

		const draft = [...tab.rows, { id: "draft-1", key: "", value: "" }];
		useQuesterStore.getState().handleEnvRowsChange(draft);

		const next = useQuesterStore.getState().openTabs[0];
		expect(next?.kind).toBe("env");
		if (next?.kind !== "env") return;
		expect(next.rows).toHaveLength(draft.length);
		expect(next.rows.at(-1)?.id).toBe("draft-1");
		expect(next.environment.variables).toEqual({
			API_BASE: "http://localhost",
		});
		expect(next.dirty).toBe(true);
	});

	test("handleSecretRowsChange keeps row ids across updates", () => {
		resetStore();
		const secrets: SecretsV1 = {
			version: "v1",
			secrets: { TOKEN: "abc" },
		};
		const tab = createSecretsEditorTab("local", secrets);
		useQuesterStore.setState({ openTabs: [tab], activeTabId: tab.id });

		const updated = tab.rows.map((row) =>
			row.key === "TOKEN" ? { ...row, value: "xyz" } : row,
		);
		useQuesterStore.getState().handleSecretRowsChange(updated);

		const next = useQuesterStore.getState().openTabs[0];
		expect(next?.kind).toBe("secrets");
		if (next?.kind !== "secrets") return;
		expect(next.rows[0]?.id).toBe(tab.rows[0]?.id);
		expect(next.rows[0]?.value).toBe("xyz");
		expect(next.secrets.secrets).toEqual({ TOKEN: "xyz" });
	});
});

describe("selectors", () => {
	test("selectActiveTab and selectActiveFlowTab", () => {
		resetStore();
		const tab = createFlowEditorTab(sampleFlow);
		useQuesterStore.setState({
			openTabs: [tab],
			activeTabId: tab.id,
			workspacePath: "/tmp/ws",
			isLoading: false,
		});

		const state = useQuesterStore.getState();
		expect(selectActiveTab(state)?.kind).toBe("flow");
		expect(selectActiveFlowTab(state)?.flowId).toBe("demo-flow");
		expect(selectCanRun(state)).toBe(true);
		expect(selectAnyDirty(state)).toBe(false);
		expect(selectDirtyTabIds(state)).toEqual([]);
	});
});
