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
	selectNodeRunStatus,
} from "./selectors.js";
import { slugifyName } from "./slugify.js";

mock.module("@/lib/electrobun.js", () => ({
	desktopRpc: {
		executeFlowRpc: async () => ({
			output: { ok: true },
			nodeOutputs: { start: {}, in: { name: "demo" }, out: { ok: true } },
			nodeInputs: { start: {}, in: { name: "demo" }, out: { name: "demo" } },
			steps: [
				{ nodeId: "start", type: "start", input: {}, output: {} },
				{
					nodeId: "in",
					type: "input",
					input: { name: "demo" },
					output: { name: "demo" },
				},
				{
					nodeId: "taken",
					type: "set",
					input: { name: "demo" },
					output: { name: "demo" },
				},
				{
					nodeId: "out",
					type: "output",
					input: { ok: true },
					output: { ok: true },
				},
			],
			vars: {},
			logs: [],
		}),
	},
	onNodeRunStatus: () => () => {},
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
		canvasDirty: false,
		runResult: null,
		runError: null,
		isRunning: false,
		activeRunId: null,
		runFlowId: null,
		nodeStatuses: {},
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

	test("handleSelectNode keeps Response tab when switching nodes", () => {
		resetStore();
		useQuesterStore.setState({
			selectedNodeId: "login",
			rightPanelOpen: true,
			rightPanelTab: "response",
		});
		useQuesterStore.getState().handleSelectNode("credentials");
		const state = useQuesterStore.getState();
		expect(state.selectedNodeId).toBe("credentials");
		expect(state.rightPanelTab).toBe("response");
		expect(state.rightPanelOpen).toBe(true);
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

	test("handleRightPanelView toggles right panel like activity bar", () => {
		resetStore();
		useQuesterStore.setState({
			rightPanelOpen: true,
			rightPanelTab: "inspector",
		});
		useQuesterStore.getState().handleRightPanelView("inspector");
		expect(useQuesterStore.getState().rightPanelOpen).toBe(false);

		useQuesterStore.getState().handleRightPanelView("response");
		expect(useQuesterStore.getState().rightPanelTab).toBe("response");
		expect(useQuesterStore.getState().rightPanelOpen).toBe(true);
	});

	test("duplicateNode clones node and selects the copy", () => {
		resetStore();
		const flow: FlowV1 = {
			...sampleFlow,
			nodes: [
				{
					id: "http-1",
					type: "http",
					data: { label: "Login", method: "GET", url: "/" },
					position: { x: 10, y: 20 },
				},
			],
		};
		const tab = createFlowEditorTab(flow);
		useQuesterStore.setState({ openTabs: [tab], activeTabId: tab.id });
		useQuesterStore.getState().duplicateNode("http-1");

		const state = useQuesterStore.getState();
		const next = selectActiveFlowTab(state);
		expect(next?.flow.nodes).toHaveLength(2);
		expect(state.selectedNodeId).toBe(next?.flow.nodes[1]?.id);
		expect(state.canvasDirty).toBe(true);
		expect(next?.dirty).toBe(true);
	});

	test("deleteNodes removes node and clears selection", () => {
		resetStore();
		const flow: FlowV1 = {
			...sampleFlow,
			nodes: [
				{
					id: "http-1",
					type: "http",
					data: { label: "Login" },
					position: { x: 0, y: 0 },
				},
			],
			edges: [],
		};
		const tab = createFlowEditorTab(flow);
		useQuesterStore.setState({
			openTabs: [tab],
			activeTabId: tab.id,
			selectedNodeId: "http-1",
		});
		useQuesterStore.getState().deleteNodes(["http-1"]);

		const state = useQuesterStore.getState();
		expect(selectActiveFlowTab(state)?.flow.nodes).toEqual([]);
		expect(state.selectedNodeId).toBeNull();
		expect(state.canvasDirty).toBe(true);
	});

	test("deleteEdges removes only the edge", () => {
		resetStore();
		const flow: FlowV1 = {
			...sampleFlow,
			nodes: [
				{
					id: "a",
					type: "input",
					data: { label: "A" },
					position: { x: 0, y: 0 },
				},
				{
					id: "b",
					type: "output",
					data: { label: "B" },
					position: { x: 100, y: 0 },
				},
			],
			edges: [{ id: "e-1", source: "a", target: "b", sourceHandle: null }],
		};
		const tab = createFlowEditorTab(flow);
		useQuesterStore.setState({ openTabs: [tab], activeTabId: tab.id });
		useQuesterStore.getState().deleteEdges(["e-1"]);

		const next = selectActiveFlowTab(useQuesterStore.getState());
		expect(next?.flow.nodes).toHaveLength(2);
		expect(next?.flow.edges).toEqual([]);
		expect(useQuesterStore.getState().canvasDirty).toBe(true);
	});

	test("handleGraphChange marks canvasDirty", () => {
		resetStore();
		const flow: FlowV1 = {
			...sampleFlow,
			nodes: [
				{
					id: "a",
					type: "input",
					data: { label: "A" },
					position: { x: 0, y: 0 },
				},
			],
		};
		const tab = createFlowEditorTab(flow);
		useQuesterStore.setState({ openTabs: [tab], activeTabId: tab.id });
		useQuesterStore.getState().handleGraphChange(
			[
				{
					id: "a",
					type: "input",
					position: { x: 50, y: 0 },
					data: { label: "A" },
				},
			],
			[],
		);
		expect(useQuesterStore.getState().canvasDirty).toBe(true);
		expect(selectActiveFlowTab(useQuesterStore.getState())?.dirty).toBe(true);
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

	test("applyNodeRunStatusEvent applies live transitions for active run", () => {
		resetStore();
		useQuesterStore.setState({
			activeRunId: "run-1",
			runFlowId: "demo-flow",
			nodeStatuses: { a: "idle", b: "idle" },
		});
		useQuesterStore.getState().applyNodeRunStatusEvent({
			runId: "run-1",
			flowId: "demo-flow",
			nodeId: "a",
			nodeType: "http",
			status: "running",
			ts: 1,
		});
		useQuesterStore.getState().applyNodeRunStatusEvent({
			runId: "run-1",
			flowId: "demo-flow",
			nodeId: "a",
			nodeType: "http",
			status: "success",
			ts: 2,
		});
		expect(useQuesterStore.getState().nodeStatuses).toEqual({
			a: "success",
			b: "idle",
		});
	});

	test("applyNodeRunStatusEvent ignores stale run and flow ids", () => {
		resetStore();
		useQuesterStore.setState({
			activeRunId: "run-1",
			runFlowId: "demo-flow",
			nodeStatuses: { a: "idle" },
		});
		useQuesterStore.getState().applyNodeRunStatusEvent({
			runId: "run-old",
			flowId: "demo-flow",
			nodeId: "a",
			nodeType: "http",
			status: "running",
			ts: 1,
		});
		useQuesterStore.getState().applyNodeRunStatusEvent({
			runId: "run-1",
			flowId: "other-flow",
			nodeId: "a",
			nodeType: "http",
			status: "error",
			ts: 2,
		});
		expect(useQuesterStore.getState().nodeStatuses).toEqual({ a: "idle" });
	});

	test("selectNodeRunStatus is scoped to runFlowId", () => {
		resetStore();
		const tab = createFlowEditorTab(sampleFlow);
		useQuesterStore.setState({
			openTabs: [tab],
			activeTabId: tab.id,
			runFlowId: "demo-flow",
			nodeStatuses: { n1: "success" },
		});
		expect(selectNodeRunStatus(useQuesterStore.getState(), "n1")).toBe(
			"success",
		);

		useQuesterStore.setState({ runFlowId: "other" });
		expect(
			selectNodeRunStatus(useQuesterStore.getState(), "n1"),
		).toBeUndefined();
	});

	test("runFlow initializes idle statuses and reconciles skipped nodes", async () => {
		resetStore();
		const flow: FlowV1 = {
			...sampleFlow,
			nodes: [
				{ id: "start", type: "start", data: {}, position: { x: 0, y: 0 } },
				{ id: "in", type: "input", data: {}, position: { x: 40, y: 0 } },
				{
					id: "taken",
					type: "set",
					data: { variables: {} },
					position: { x: 80, y: 0 },
				},
				{
					id: "skipped",
					type: "set",
					data: { variables: {} },
					position: { x: 80, y: 40 },
				},
				{ id: "out", type: "output", data: {}, position: { x: 120, y: 0 } },
			],
			edges: [],
		};
		const tab = createFlowEditorTab(flow);
		useQuesterStore.setState({
			openTabs: [tab],
			activeTabId: tab.id,
			workspacePath: "/tmp/ws",
			selectedEnv: "local",
			inputJson: '{"name":"demo"}',
		});

		const runPromise = useQuesterStore.getState().runFlow();
		expect(useQuesterStore.getState().isRunning).toBe(true);
		expect(useQuesterStore.getState().activeRunId).toBeTruthy();
		expect(useQuesterStore.getState().runFlowId).toBe("demo-flow");
		expect(useQuesterStore.getState().nodeStatuses).toEqual({
			start: "idle",
			in: "idle",
			taken: "idle",
			skipped: "idle",
			out: "idle",
		});

		await runPromise;

		expect(useQuesterStore.getState().isRunning).toBe(false);
		expect(useQuesterStore.getState().nodeStatuses).toEqual({
			start: "success",
			in: "success",
			taken: "success",
			skipped: "skipped",
			out: "success",
		});
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
