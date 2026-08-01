import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	cancelFlowRun,
	createFlow,
	deleteFlow,
	ensureUserSampleWorkspace,
	executeFlowRpc,
	listCollectionRequests,
	listEnvs,
	listFlows,
	listSecretFiles,
	listSecretNames,
	loadEnvironment,
	loadFlow,
	loadRequest,
	loadSampleFlowJson,
	loadSecretsFile,
	openWorkspace,
	openWorkspaceSummary,
	readPathShapes,
	renameFlow,
	resolveSampleWorkspaceSource,
	resolveUserSampleWorkspaceRoot,
	saveEnvironment,
	saveFlow,
	writePathShapes,
} from "./service.js";

const sampleWorkspace = join(
	import.meta.dir,
	"../../../examples/sample-workspace",
);

describe("workspace-service", () => {
	test("resolveSampleWorkspaceSource finds monorepo sample", () => {
		const source = resolveSampleWorkspaceSource({});
		expect(source).toBeTruthy();
		expect(source?.replaceAll("\\", "/")).toMatch(/sample-workspace$/);
	});

	test("ensureUserSampleWorkspace copies sample into user dir", async () => {
		const destRoot = await mkdtemp(join(tmpdir(), "quester-user-sample-"));
		const dest = join(destRoot, "sample-workspace");
		try {
			const path = await ensureUserSampleWorkspace({
				QUESTER_USER_SAMPLE_DIR: dest,
				QUESTER_SAMPLE_SOURCE: sampleWorkspace,
			} as NodeJS.ProcessEnv);
			expect(path).toBe(dest);
			const ws = await openWorkspace(path);
			expect(ws.manifest.name).toBe("sample-workspace");
			// Second call reuses existing copy
			const again = await ensureUserSampleWorkspace({
				QUESTER_USER_SAMPLE_DIR: dest,
				QUESTER_SAMPLE_SOURCE: sampleWorkspace,
			} as NodeJS.ProcessEnv);
			expect(again).toBe(dest);
		} finally {
			await rm(destRoot, { recursive: true, force: true });
		}
	});

	test("resolveUserSampleWorkspaceRoot uses APPDATA on win32 override", () => {
		const path = resolveUserSampleWorkspaceRoot({
			QUESTER_USER_SAMPLE_DIR: "/tmp/custom-sample",
		} as NodeJS.ProcessEnv);
		expect(path.replaceAll("\\", "/")).toContain("custom-sample");
	});

	test("openWorkspace loads sample workspace", async () => {
		const ws = await openWorkspace(sampleWorkspace);
		expect(ws.manifest.name).toBe("sample-workspace");
		expect(ws.flows["login-and-profile"]).toBeDefined();
	});

	test("openWorkspaceSummary returns summary shape", async () => {
		const summary = await openWorkspaceSummary(sampleWorkspace);
		expect(summary.name).toBe("sample-workspace");
		expect(summary.root).toBe(sampleWorkspace);
		expect(summary.envNames).toEqual(["local"]);
		expect(summary.flowCount).toBeGreaterThan(0);
	});

	test("listFlows returns flow metadata", async () => {
		const flows = await listFlows(sampleWorkspace);
		expect(flows).toContainEqual({
			id: "login-and-profile",
			name: "Login and profile (dummyjson)",
		});
	});

	test("listCollectionRequests returns sample requests", async () => {
		const requests = await listCollectionRequests(sampleWorkspace);
		expect(requests.some((r) => r.path === "Auth/login")).toBe(true);
		expect(requests.some((r) => r.path === "Products/add-product")).toBe(true);
		expect(requests.some((r) => r.path === "System/ping")).toBe(true);
		const login = await loadRequest(sampleWorkspace, "Auth/login");
		expect(login.method).toBe("POST");
		expect(login.url).toContain("{{env.API_BASE}}");
		expect(login.url).toContain("/auth/login");
	});

	test("listEnvs returns environment names", async () => {
		const envs = await listEnvs(sampleWorkspace);
		expect(envs).toEqual(["local"]);
	});

	test("loadFlow returns flow document", async () => {
		const flow = await loadFlow("login-and-profile", sampleWorkspace);
		expect(flow.id).toBe("login-and-profile");
		expect(flow.nodes.length).toBeGreaterThan(0);
	});

	test("loadSampleFlowJson returns a valid flow document", async () => {
		const flow = await loadSampleFlowJson();
		expect(flow.id).toBe("login-and-profile");
		expect(flow.nodes.length).toBeGreaterThan(0);
	});

	test("executeFlowRpc runs sample flow with secrets loaded", async () => {
		const result = await executeFlowRpc("login-and-profile", {
			workspace: sampleWorkspace,
			env: "local",
			input: { username: "emilys", password: "emilyspass" },
		});
		expect(Array.isArray(result.logs)).toBe(true);
		expect(result.logs.length).toBeGreaterThan(0);
		// Live HTTP may fail on TLS in some environments; still expect structured result.
		if (result.error) {
			expect(result.failedNodeId).toBeDefined();
			expect(result.steps.length).toBeGreaterThan(0);
			expect(result.logs.some((l) => l.level === "error")).toBe(true);
			return;
		}
		expect(result.output).toBeDefined();
		expect(result.steps.length).toBeGreaterThan(0);
	});

	test("executeFlowRpc logs include per-node input and output objects", async () => {
		const flowId = "desktop-log-io-test";
		await createFlow(sampleWorkspace, flowId, "Log IO Test");
		try {
			const flow = await loadFlow(flowId, sampleWorkspace);
			await saveFlow(
				{
					...flow,
					nodes: [
						{
							id: "start",
							type: "start",
							data: { label: "Start" },
							position: { x: -160, y: 0 },
						},
						{
							id: "in",
							type: "input",
							data: { label: "Input" },
							position: { x: 0, y: 0 },
						},
						{
							id: "set",
							type: "set",
							data: { variables: { greeted: "yes" } },
							position: { x: 160, y: 0 },
						},
						{
							id: "out",
							type: "output",
							data: { label: "Output" },
							position: { x: 320, y: 0 },
						},
					],
					edges: [
						{ id: "e0", source: "start", target: "in" },
						{ id: "e1", source: "in", target: "set" },
						{ id: "e2", source: "set", target: "out" },
					],
				},
				sampleWorkspace,
			);

			const result = await executeFlowRpc(flowId, {
				workspace: sampleWorkspace,
				env: "local",
				input: { name: "demo" },
			});

			expect(result.steps.map((s) => s.nodeId)).toEqual([
				"start",
				"in",
				"set",
				"out",
			]);
			expect(result.nodeInputs.in).toEqual({ name: "demo" });
			expect(result.nodeInputs.set).toEqual({ name: "demo" });

			const afterLogs = result.logs.filter((l) => l.phase === "after");
			expect(afterLogs.length).toBe(4);
			expect(afterLogs[1]?.data).toEqual({
				input: { name: "demo" },
				output: { name: "demo" },
			});
			expect(afterLogs[2]?.data).toMatchObject({
				input: { name: "demo" },
				output: { name: "demo" },
			});
		} finally {
			await deleteFlow(flowId, sampleWorkspace);
		}
	});

	test("executeFlowRpc returns partial node I/O when a node fails", async () => {
		const flowId = "desktop-fail-partial-test";
		await createFlow(sampleWorkspace, flowId, "Fail Partial Test");
		try {
			const flow = await loadFlow(flowId, sampleWorkspace);
			await saveFlow(
				{
					...flow,
					nodes: [
						{
							id: "start",
							type: "start",
							data: { label: "Start" },
							position: { x: -160, y: 0 },
						},
						{
							id: "in",
							type: "input",
							data: { label: "Input" },
							position: { x: 0, y: 0 },
						},
						{
							id: "http",
							type: "http",
							data: {
								method: "GET",
								url: "file:///tmp/x",
								headers: {},
							},
							position: { x: 160, y: 0 },
						},
					],
					edges: [
						{ id: "e0", source: "start", target: "in" },
						{ id: "e1", source: "in", target: "http" },
					],
				},
				sampleWorkspace,
			);

			const result = await executeFlowRpc(flowId, {
				workspace: sampleWorkspace,
				env: "local",
				input: { name: "demo" },
			});

			expect(result.error).toBeDefined();
			expect(result.failedNodeId).toBe("http");
			expect(result.nodeInputs.http).toEqual({ name: "demo" });
			expect(result.steps.some((s) => s.nodeId === "http" && s.error)).toBe(
				true,
			);
		} finally {
			await deleteFlow(flowId, sampleWorkspace);
		}
	});

	test("executeFlowRpc onNodeStatus emits ordered lifecycle callbacks", async () => {
		const flowId = "desktop-status-callback-test";
		await createFlow(sampleWorkspace, flowId, "Status Callback Test");
		try {
			const flow = await loadFlow(flowId, sampleWorkspace);
			await saveFlow(
				{
					...flow,
					nodes: [
						{
							id: "start",
							type: "start",
							data: { label: "Start" },
							position: { x: -160, y: 0 },
						},
						{
							id: "in",
							type: "input",
							data: { label: "Input" },
							position: { x: 0, y: 0 },
						},
						{
							id: "set",
							type: "set",
							data: { variables: { greeted: "yes" } },
							position: { x: 160, y: 0 },
						},
						{
							id: "out",
							type: "output",
							data: { label: "Output" },
							position: { x: 320, y: 0 },
						},
					],
					edges: [
						{ id: "e0", source: "start", target: "in" },
						{ id: "e1", source: "in", target: "set" },
						{ id: "e2", source: "set", target: "out" },
					],
				},
				sampleWorkspace,
			);

			const events: Array<{ nodeId: string; status: string }> = [];
			const result = await executeFlowRpc(flowId, {
				workspace: sampleWorkspace,
				env: "local",
				runId: "run-status-1",
				input: { name: "demo" },
				onNodeStatus: (event) => {
					events.push({ nodeId: event.nodeId, status: event.status });
				},
			});

			expect(result.error).toBeUndefined();
			expect(events).toEqual([
				{ nodeId: "start", status: "running" },
				{ nodeId: "start", status: "success" },
				{ nodeId: "in", status: "running" },
				{ nodeId: "in", status: "success" },
				{ nodeId: "set", status: "running" },
				{ nodeId: "set", status: "success" },
				{ nodeId: "out", status: "running" },
				{ nodeId: "out", status: "success" },
			]);
		} finally {
			await deleteFlow(flowId, sampleWorkspace);
		}
	});

	test("executeFlowRpc onNodeStatus emits error for failed node", async () => {
		const flowId = "desktop-status-error-test";
		await createFlow(sampleWorkspace, flowId, "Status Error Test");
		try {
			const flow = await loadFlow(flowId, sampleWorkspace);
			await saveFlow(
				{
					...flow,
					nodes: [
						{
							id: "start",
							type: "start",
							data: { label: "Start" },
							position: { x: -160, y: 0 },
						},
						{
							id: "in",
							type: "input",
							data: { label: "Input" },
							position: { x: 0, y: 0 },
						},
						{
							id: "http",
							type: "http",
							data: {
								method: "GET",
								url: "file:///tmp/x",
								headers: {},
							},
							position: { x: 160, y: 0 },
						},
					],
					edges: [
						{ id: "e0", source: "start", target: "in" },
						{ id: "e1", source: "in", target: "http" },
					],
				},
				sampleWorkspace,
			);

			const events: Array<{ nodeId: string; status: string }> = [];
			const result = await executeFlowRpc(flowId, {
				workspace: sampleWorkspace,
				env: "local",
				runId: "run-status-err",
				input: {},
				onNodeStatus: (event) => {
					events.push({ nodeId: event.nodeId, status: event.status });
				},
			});

			expect(result.error).toBeDefined();
			expect(events).toEqual([
				{ nodeId: "start", status: "running" },
				{ nodeId: "start", status: "success" },
				{ nodeId: "in", status: "running" },
				{ nodeId: "in", status: "success" },
				{ nodeId: "http", status: "running" },
				{ nodeId: "http", status: "error" },
			]);
		} finally {
			await deleteFlow(flowId, sampleWorkspace);
		}
	});

	test("executeFlowRpc returns partial result when cancelled via cancelFlowRun", async () => {
		const flowId = "cancel-test-flow";
		await createFlow(sampleWorkspace, flowId, "Cancel test");
		try {
			const flow = await loadFlow(flowId, sampleWorkspace);
			await saveFlow(
				{
					...flow,
					nodes: [
						{ id: "start", type: "start", data: {} },
						{ id: "a", type: "set", data: { variables: { step: "a" } } },
						{ id: "b", type: "set", data: { variables: { step: "b" } } },
						{ id: "out", type: "output", data: {} },
					],
					edges: [
						{ id: "e0", source: "start", target: "a" },
						{ id: "e1", source: "a", target: "b" },
						{ id: "e2", source: "b", target: "out" },
					],
				},
				sampleWorkspace,
			);

			const runId = "run-cancel-test";
			const runPromise = executeFlowRpc(flowId, {
				workspace: sampleWorkspace,
				env: "local",
				runId,
				input: {},
				onNodeStatus: (event) => {
					if (event.nodeId === "a" && event.status === "success") {
						cancelFlowRun(runId);
					}
				},
			});

			const result = await runPromise;
			expect(result.cancelled).toBe(true);
			expect(result.error).toBe("Flow run cancelled");
			expect(result.steps.map((s) => s.nodeId)).toEqual(["start", "a"]);
			expect(result.vars.step).toBe("a");
		} finally {
			await deleteFlow(flowId, sampleWorkspace);
		}
	});

	test("saveFlow writes flow json to workspace", async () => {
		const flow = await loadFlow("login-and-profile", sampleWorkspace);
		const updated = {
			...flow,
			description: "desktop save test",
		};
		const saved = await saveFlow(updated, sampleWorkspace);
		expect(saved.description).toBe("desktop save test");
		const reloaded = await loadFlow("login-and-profile", sampleWorkspace);
		expect(reloaded.description).toBe("desktop save test");
		// restore
		await saveFlow(flow, sampleWorkspace);
	});

	test("listSecretNames returns secret keys for env", async () => {
		const names = await listSecretNames(sampleWorkspace, "local");
		expect(Array.isArray(names)).toBe(true);
	});

	test("createFlow deleteFlow renameFlow manage workspace files", async () => {
		const created = await createFlow(
			sampleWorkspace,
			"desktop-test-flow",
			"Desktop test",
		);
		expect(created.id).toBe("desktop-test-flow");
		expect(created.name).toBe("Desktop test");

		const renamed = await renameFlow(
			sampleWorkspace,
			"desktop-test-flow",
			"desktop-test-renamed",
			"Renamed test",
		);
		expect(renamed.id).toBe("desktop-test-renamed");
		expect(renamed.name).toBe("Renamed test");

		await deleteFlow("desktop-test-renamed", sampleWorkspace);
		const flows = await listFlows(sampleWorkspace);
		expect(flows.some((f) => f.id === "desktop-test-renamed")).toBe(false);
	});

	test("loadEnvironment saveEnvironment round-trip", async () => {
		const env = await loadEnvironment(sampleWorkspace, "local");
		expect(env.name).toBe("local");
		expect(env.variables.API_BASE).toBeDefined();

		const updated = {
			...env,
			variables: { ...env.variables, TEST_VAR: "desktop-test" },
		};
		const saved = await saveEnvironment(sampleWorkspace, updated);
		expect(saved.variables.TEST_VAR).toBe("desktop-test");

		await saveEnvironment(sampleWorkspace, env);
	});

	test("listSecretFiles returns secret file metadata", async () => {
		const files = await listSecretFiles(sampleWorkspace);
		expect(Array.isArray(files)).toBe(true);
	});

	test("readPathShapes writePathShapes round-trip under .quester", async () => {
		const payload = {
			version: 1,
			updatedAt: 1,
			sources: {
				"nodes.login": { paths: ["status", "body.id"], lastSeen: 1 },
			},
		};
		await writePathShapes(sampleWorkspace, payload);
		const loaded = await readPathShapes(sampleWorkspace);
		expect(loaded).toEqual(payload);
		await rm(join(sampleWorkspace, ".quester"), {
			recursive: true,
			force: true,
		});
		expect(await readPathShapes(sampleWorkspace)).toBeNull();
	});
});
