import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
	executeFlowRpc,
	listEnvs,
	listFlows,
	loadFlow,
	loadSampleFlowJson,
	openWorkspace,
	openWorkspaceSummary,
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
		expect(summary).toEqual({
			name: "sample-workspace",
			root: sampleWorkspace,
			envNames: ["local"],
			flowCount: 1,
		});
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
	});
});
