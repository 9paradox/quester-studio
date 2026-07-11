import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
	createFlow,
	deleteFlow,
	executeFlowRpc,
	listEnvs,
	listFlows,
	listSecretFiles,
	listSecretNames,
	loadEnvironment,
	loadFlow,
	loadSampleFlowJson,
	loadSecretsFile,
	openWorkspace,
	openWorkspaceSummary,
	renameFlow,
	saveEnvironment,
	saveFlow,
} from "./handlers.js";

const sampleWorkspace = join(
	import.meta.dir,
	"../../../../examples/sample-workspace",
);

describe("desktop main handlers", () => {
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
			name: "Login and profile (JSONPlaceholder)",
		});
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
			input: { username: "demo", email: "demo@example.com" },
		});
		expect(result.output).toBeDefined();
		expect(Array.isArray(result.logs)).toBe(true);
		expect(result.logs.length).toBeGreaterThan(0);
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
});
