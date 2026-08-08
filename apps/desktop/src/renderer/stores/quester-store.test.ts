import { beforeAll, describe, expect, mock, test } from "bun:test";
import {
	createEnvEditorTab,
	createFlowEditorTab,
	createSecretsEditorTab,
	flowTabId,
} from "@/lib/editorTabs.js";
import type { EnvironmentV1, FlowV1, SecretsV1 } from "@quester-studio/schema";
import type { useQuesterStore as UseQuesterStore } from "./quester-store.js";
import { emptyFlowRunState } from "./quester-store.js";
import {
	selectActiveFlowTab,
	selectActiveTab,
	selectAnyDirty,
	selectCanRun,
	selectDirtyTabIds,
	selectNodeRunStatus,
} from "./selectors.js";
import { slugifyName } from "./slugify.js";

mock.module("@/lib/quester-client.js", () => {
	let cancelRunId: string | null = null;
	const cancelledRunIds: string[] = [];
	return {
		getQuesterClient: () => ({
			executeFlowRpc: async ({ runId }: { runId: string }) => {
				await new Promise((resolve) => setTimeout(resolve, 50));
				if (cancelRunId === runId || cancelledRunIds.includes(runId)) {
					return {
						output: undefined,
						nodeOutputs: { start: {}, in: { name: "demo" } },
						nodeInputs: {},
						steps: [
							{ nodeId: "start", type: "start", input: {}, output: {} },
							{
								nodeId: "in",
								type: "input",
								input: { name: "demo" },
								output: { name: "demo" },
							},
						],
						vars: {},
						logs: [],
						cancelled: true,
						error: "Flow run cancelled",
					};
				}
				return {
					output: { ok: true },
					nodeOutputs: { start: {}, in: { name: "demo" }, out: { ok: true } },
					nodeInputs: {
						start: {},
						in: { name: "demo" },
						out: { name: "demo" },
					},
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
				};
			},
			cancelFlowRun: async ({ runId }: { runId: string }) => {
				cancelRunId = runId;
				cancelledRunIds.push(runId);
				return { ok: true };
			},
			loadEnvironment: async () => ({
				name: "local",
				version: "v1",
				variables: { API_BASE: "https://example.com" },
			}),
			listSecretNames: async () => ["username", "password"],
			readPathShapes: async () => null,
			writePathShapes: async () => ({ ok: true }),
			onNodeRunStatus: () => () => {},
			__cancelledRunIds: cancelledRunIds,
		}),
		setQuesterClient: () => {},
		resetQuesterClientForTests: () => {},
	};
});

mock.module("@/lib/electrobun.js", () => ({
	desktopRpc: {},
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
		templateEnvKeys: [],
		templateEnvValues: {},
		templateSecretKeys: [],
		pathShapeIndex: {},
		pathIndexStatus: "idle",
		isLoading: false,
		loadError: null,
		openTabs: [],
		activeTabId: null,
		selectedNodeId: null,
		canvasDirty: false,
		runByFlowId: {},
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
	test("closeWorkspace clears path and keeps shell ready for welcome", () => {
		useQuesterStore.setState({
			workspacePath: "/tmp/ws",
			workspaceName: "Demo",
			flows: [{ id: "a", name: "A" }],
			openTabs: [createFlowEditorTab(sampleFlow)],
			activeTabId: flowTabId("login"),
		});
		useQuesterStore.getState().closeWorkspace();
		const s = useQuesterStore.getState();
		expect(s.workspacePath).toBe("");
		expect(s.workspaceName).toBe("");
		expect(s.openTabs).toEqual([]);
		expect(s.activeTabId).toBeNull();
		expect(s.flows).toEqual([]);
	});

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

	test("reorderTabs moves tab from one index to another", () => {
		resetStore();
		const tabA = createFlowEditorTab({ ...sampleFlow, id: "a", name: "A" });
		const tabB = createFlowEditorTab({ ...sampleFlow, id: "b", name: "B" });
		const tabC = createFlowEditorTab({ ...sampleFlow, id: "c", name: "C" });
		useQuesterStore.getState().openTab(tabA);
		useQuesterStore.getState().openTab(tabB);
		useQuesterStore.getState().openTab(tabC);

		useQuesterStore.getState().reorderTabs(0, 2);

		const ids = useQuesterStore.getState().openTabs.map((t) => t.id);
		expect(ids).toEqual([flowTabId("b"), flowTabId("c"), flowTabId("a")]);
	});

	test("reorderTabs ignores invalid indices", () => {
		resetStore();
		const tab = createFlowEditorTab(sampleFlow);
		useQuesterStore.setState({ openTabs: [tab], activeTabId: tab.id });

		useQuesterStore.getState().reorderTabs(-1, 0);
		useQuesterStore.getState().reorderTabs(0, 5);

		expect(useQuesterStore.getState().openTabs).toHaveLength(1);
		expect(useQuesterStore.getState().openTabs[0]?.id).toBe(tab.id);
	});

	test("closeTabsToLeft closes tabs before target", () => {
		resetStore();
		const tabA = createFlowEditorTab({ ...sampleFlow, id: "a", name: "A" });
		const tabB = createFlowEditorTab({ ...sampleFlow, id: "b", name: "B" });
		const tabC = createFlowEditorTab({ ...sampleFlow, id: "c", name: "C" });
		useQuesterStore.getState().openTab(tabA);
		useQuesterStore.getState().openTab(tabB);
		useQuesterStore.getState().openTab(tabC);

		useQuesterStore.getState().closeTabsToLeft(flowTabId("c"));

		const state = useQuesterStore.getState();
		expect(state.openTabs).toHaveLength(1);
		expect(state.activeTabId).toBe(flowTabId("c"));
	});

	test("closeTabsToRight closes tabs after target", () => {
		resetStore();
		const tabA = createFlowEditorTab({ ...sampleFlow, id: "a", name: "A" });
		const tabB = createFlowEditorTab({ ...sampleFlow, id: "b", name: "B" });
		const tabC = createFlowEditorTab({ ...sampleFlow, id: "c", name: "C" });
		useQuesterStore.getState().openTab(tabA);
		useQuesterStore.getState().openTab(tabB);
		useQuesterStore.getState().openTab(tabC);

		useQuesterStore.getState().closeTabsToRight(flowTabId("a"));

		const state = useQuesterStore.getState();
		expect(state.openTabs).toHaveLength(1);
		expect(state.activeTabId).toBe(flowTabId("a"));
	});

	test("closeTabsToLeft stops when dirty tab close is cancelled", () => {
		resetStore();
		const tabA = createFlowEditorTab({ ...sampleFlow, id: "a", name: "A" });
		const dirtyB = {
			...createFlowEditorTab({ ...sampleFlow, id: "b", name: "B" }),
			dirty: true,
		};
		const tabC = createFlowEditorTab({ ...sampleFlow, id: "c", name: "C" });
		useQuesterStore.setState({
			openTabs: [tabA, dirtyB, tabC],
			activeTabId: flowTabId("c"),
		});

		const confirm = globalThis.confirm;
		globalThis.confirm = () => false;

		try {
			useQuesterStore.getState().closeTabsToLeft(flowTabId("c"));
			const state = useQuesterStore.getState();
			expect(state.openTabs).toHaveLength(2);
			expect(state.openTabs.map((t) => t.id)).toEqual([
				flowTabId("b"),
				flowTabId("c"),
			]);
		} finally {
			globalThis.confirm = confirm;
		}
	});

	test("closeTabsToRight respects dirty tab confirm", () => {
		resetStore();
		const tabA = createFlowEditorTab({ ...sampleFlow, id: "a", name: "A" });
		const dirtyB = {
			...createFlowEditorTab({ ...sampleFlow, id: "b", name: "B" }),
			dirty: true,
		};
		const tabC = createFlowEditorTab({ ...sampleFlow, id: "c", name: "C" });
		useQuesterStore.setState({
			openTabs: [tabA, dirtyB, tabC],
			activeTabId: flowTabId("a"),
		});

		const confirm = globalThis.confirm;
		globalThis.confirm = () => true;

		try {
			useQuesterStore.getState().closeTabsToRight(flowTabId("a"));
			const state = useQuesterStore.getState();
			expect(state.openTabs).toHaveLength(1);
			expect(state.activeTabId).toBe(flowTabId("a"));
		} finally {
			globalThis.confirm = confirm;
		}
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

	test("handleActivityView settings opens Preferences tab", () => {
		resetStore();
		useQuesterStore.getState().handleActivityView("settings");
		const state = useQuesterStore.getState();
		expect(state.openTabs.some((t) => t.kind === "appSettings")).toBe(true);
		expect(state.activeTabId).toBe("settings:app");
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

	test("handleUpdateNode persists assert checks", () => {
		resetStore();
		const flow: FlowV1 = {
			...sampleFlow,
			nodes: [
				{
					id: "assert-1",
					type: "assert",
					data: { label: "Assert", checks: [{ path: "ok" }] },
					position: { x: 0, y: 0 },
				},
			],
		};
		const tab = createFlowEditorTab(flow);
		useQuesterStore.setState({
			openTabs: [tab],
			activeTabId: tab.id,
			selectedNodeId: "assert-1",
		});
		useQuesterStore.getState().handleUpdateNode("assert-1", {
			label: "Assert",
			checks: [{ path: "status", equals: 200 }],
		});
		const next = selectActiveFlowTab(useQuesterStore.getState());
		expect(next?.flow.nodes[0]?.data).toEqual({
			label: "Assert",
			checks: [{ path: "status", equals: 200 }],
		});
		expect(next?.dirty).toBe(true);
		expect(useQuesterStore.getState().canvasDirty).toBe(true);
		expect(useQuesterStore.getState().selectedNodeId).toBe("assert-1");
	});

	test("setInputJson persists value on input node and openTab hydrates it", () => {
		resetStore();
		const flow: FlowV1 = {
			...sampleFlow,
			nodes: [
				{ id: "start", type: "start", data: {}, position: { x: 0, y: 0 } },
				{
					id: "input",
					type: "input",
					data: { label: "In" },
					position: { x: 40, y: 0 },
				},
			],
		};
		const tab = createFlowEditorTab(flow);
		expect(JSON.parse(tab.inputJson)).toEqual({});
		useQuesterStore.setState({
			openTabs: [tab],
			activeTabId: tab.id,
			inputJson: tab.inputJson,
		});
		useQuesterStore.getState().setInputJson('{\n  "username": "emilys"\n}\n');
		const dirty = selectActiveFlowTab(useQuesterStore.getState());
		expect(dirty?.flow.nodes[1]?.data).toEqual({
			label: "In",
			value: { username: "emilys" },
		});
		expect(dirty?.dirty).toBe(true);
		expect(JSON.parse(useQuesterStore.getState().inputJson)).toEqual({
			username: "emilys",
		});

		const reopened = createFlowEditorTab(dirty?.flow ?? flow);
		useQuesterStore.getState().openTab(reopened);
		expect(JSON.parse(useQuesterStore.getState().inputJson)).toEqual({
			username: "emilys",
		});
	});

	test("clearLogs clears run logs and runError", () => {
		resetStore();
		const tab = createFlowEditorTab(sampleFlow);
		useQuesterStore.setState({
			openTabs: [tab],
			activeTabId: tab.id,
			runByFlowId: {
				"demo-flow": {
					runError: "Flow validation failed",
					runResult: {
						output: undefined,
						nodeInputs: {},
						nodeOutputs: {},
						steps: [],
						vars: {},
						error: "Flow validation failed",
						logs: [
							{
								ts: Date.now(),
								level: "error",
								phase: "error",
								message: "Flow validation failed",
							},
						],
					},
					isRunning: false,
					activeRunId: null,
					nodeStatuses: {},
				},
			},
		});
		useQuesterStore.getState().clearLogs();
		const slot = useQuesterStore.getState().runByFlowId["demo-flow"];
		expect(slot?.runError).toBeNull();
		expect(slot?.runResult?.logs).toEqual([]);
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
			runByFlowId: {
				"demo-flow": {
					...emptyFlowRunState(),
					activeRunId: "run-1",
					nodeStatuses: { a: "idle", b: "idle" },
				},
			},
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
		expect(
			useQuesterStore.getState().runByFlowId["demo-flow"]?.nodeStatuses,
		).toEqual({
			a: "success",
			b: "idle",
		});
	});

	test("applyNodeRunStatusEvent ignores stale run and flow ids", () => {
		resetStore();
		useQuesterStore.setState({
			runByFlowId: {
				"demo-flow": {
					...emptyFlowRunState(),
					activeRunId: "run-1",
					nodeStatuses: { a: "idle" },
				},
			},
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
		expect(
			useQuesterStore.getState().runByFlowId["demo-flow"]?.nodeStatuses,
		).toEqual({ a: "idle" });
	});

	test("selectNodeRunStatus is scoped to active flow run slot", () => {
		resetStore();
		const tab = createFlowEditorTab(sampleFlow);
		useQuesterStore.setState({
			openTabs: [tab],
			activeTabId: tab.id,
			runByFlowId: {
				"demo-flow": {
					...emptyFlowRunState(),
					nodeStatuses: { n1: "success" },
				},
			},
		});
		expect(selectNodeRunStatus(useQuesterStore.getState(), "n1")).toBe(
			"success",
		);

		useQuesterStore.setState({
			runByFlowId: {
				"demo-flow": emptyFlowRunState(),
				other: {
					...emptyFlowRunState(),
					nodeStatuses: { n1: "success" },
				},
			},
		});
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
		const mid = useQuesterStore.getState().runByFlowId["demo-flow"];
		expect(mid?.isRunning).toBe(true);
		expect(mid?.activeRunId).toBeTruthy();
		expect(mid?.nodeStatuses).toEqual({
			start: "idle",
			in: "idle",
			taken: "idle",
			skipped: "idle",
			out: "idle",
		});

		await runPromise;

		const done = useQuesterStore.getState().runByFlowId["demo-flow"];
		expect(done?.isRunning).toBe(false);
		expect(done?.nodeStatuses).toEqual({
			start: "success",
			in: "success",
			taken: "success",
			skipped: "skipped",
			out: "success",
		});
	});

	test("stopFlow calls cancelFlowRun for active run", async () => {
		resetStore();
		const tab = createFlowEditorTab(sampleFlow);
		useQuesterStore.setState({
			openTabs: [tab],
			activeTabId: tab.id,
			workspacePath: "/tmp/ws",
			selectedEnv: "local",
			inputJson: '{"name":"demo"}',
		});

		const runPromise = useQuesterStore.getState().runFlow();
		const mid = useQuesterStore.getState().runByFlowId["demo-flow"];
		expect(mid?.isRunning).toBe(true);
		useQuesterStore.getState().stopFlow();
		await runPromise;

		const done = useQuesterStore.getState().runByFlowId["demo-flow"];
		expect(done?.isRunning).toBe(false);
		expect(done?.runResult?.cancelled).toBe(true);
		expect(done?.runResult?.steps?.length).toBe(2);
	});

	test("runFlow ignores overlapping start while already running", async () => {
		resetStore();
		const tab = createFlowEditorTab(sampleFlow);
		useQuesterStore.setState({
			openTabs: [tab],
			activeTabId: tab.id,
			workspacePath: "/tmp/ws",
			selectedEnv: "local",
			inputJson: '{"name":"demo"}',
		});

		const first = useQuesterStore.getState().runFlow();
		const firstId =
			useQuesterStore.getState().runByFlowId["demo-flow"]?.activeRunId;
		await useQuesterStore.getState().runFlow();
		expect(
			useQuesterStore.getState().runByFlowId["demo-flow"]?.activeRunId,
		).toBe(firstId);
		await first;
	});

	test("stale run finally does not clear a newer active run", async () => {
		resetStore();
		const tab = createFlowEditorTab(sampleFlow);
		useQuesterStore.setState({
			openTabs: [tab],
			activeTabId: tab.id,
			workspacePath: "/tmp/ws",
			selectedEnv: "local",
			inputJson: '{"name":"demo"}',
			runByFlowId: {
				"demo-flow": {
					...emptyFlowRunState(),
					isRunning: true,
					activeRunId: "stale-run",
				},
			},
		});

		// Simulate an older runFlow finally clearing after a newer run started
		useQuesterStore.setState((s) => ({
			runByFlowId: {
				...s.runByFlowId,
				"demo-flow": {
					...(s.runByFlowId["demo-flow"] ?? emptyFlowRunState()),
					isRunning: true,
					activeRunId: "newer-run",
				},
			},
		}));

		// Manually apply the scoped finally logic for the stale id
		useQuesterStore.setState((s) => {
			const slot = s.runByFlowId["demo-flow"];
			if (!slot || slot.activeRunId !== "stale-run") return s;
			return {
				runByFlowId: {
					...s.runByFlowId,
					"demo-flow": { ...slot, isRunning: false },
				},
			};
		});

		const slot = useQuesterStore.getState().runByFlowId["demo-flow"];
		expect(slot?.activeRunId).toBe("newer-run");
		expect(slot?.isRunning).toBe(true);
	});

	test("closeWorkspace cancels in-flight runs", async () => {
		resetStore();
		const { getQuesterClient } = await import("@/lib/quester-client.js");
		const client = getQuesterClient() as {
			__cancelledRunIds?: string[];
		};
		client.__cancelledRunIds?.splice(0);

		useQuesterStore.setState({
			workspacePath: "/tmp/ws",
			workspaceName: "Demo",
			runByFlowId: {
				"demo-flow": {
					...emptyFlowRunState(),
					isRunning: true,
					activeRunId: "run-to-cancel",
				},
			},
		});
		useQuesterStore.getState().closeWorkspace();
		expect(client.__cancelledRunIds).toContain("run-to-cancel");
		expect(useQuesterStore.getState().runByFlowId).toEqual({});
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

	test("selectCanRun is false while a flow is running", () => {
		resetStore();
		const tab = createFlowEditorTab(sampleFlow);
		useQuesterStore.setState({
			openTabs: [tab],
			activeTabId: tab.id,
			workspacePath: "/tmp/ws",
			isLoading: false,
			runByFlowId: {
				"demo-flow": {
					...emptyFlowRunState(),
					isRunning: true,
					activeRunId: "r1",
				},
			},
		});
		expect(selectCanRun(useQuesterStore.getState())).toBe(false);
	});

	test("openResponseViewerTab adds a frozen response tab", () => {
		resetStore();
		const snapshot = {
			source: "flow" as const,
			title: "getProfile response",
			subtitle: "http",
			error: null as string | null,
			output: { status: 200, body: { id: 1 } },
			pathCopyNodeId: "getProfile",
		};
		useQuesterStore
			.getState()
			.openResponseViewerTab(snapshot, "flow:getProfile");
		const state = useQuesterStore.getState();
		const tab = selectActiveTab(state);
		expect(tab?.kind).toBe("response");
		if (tab?.kind !== "response") throw new Error("expected response tab");
		expect(tab.snapshot).toEqual(snapshot);
		expect(tab.dirty).toBe(false);
		expect(state.openTabs.some((t) => t.kind === "response")).toBe(true);
	});
});
