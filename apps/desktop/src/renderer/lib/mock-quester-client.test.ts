import { describe, expect, test } from "bun:test";
import {
	MOCK_WORKSPACE,
	createMockQuesterClient,
	isMockClientEnabled,
} from "./mock-quester-client.js";

describe("createMockQuesterClient", () => {
	test("loads default mock workspace and flow", async () => {
		const client = createMockQuesterClient();
		expect(await client.getDefaultWorkspace()).toBe(MOCK_WORKSPACE);
		const flows = await client.listFlows(MOCK_WORKSPACE);
		expect(flows.some((f) => f.id === "mock-flow")).toBe(true);
		const flow = await client.loadFlow("mock-flow", MOCK_WORKSPACE);
		expect(flow.nodes.length).toBeGreaterThan(0);
	});

	test("executeFlowRpc returns mock result and emits status", async () => {
		const client = createMockQuesterClient();
		const events: string[] = [];
		client.onNodeRunStatus((e) => {
			events.push(`${e.nodeId}:${e.status}`);
		});
		const result = await client.executeFlowRpc({
			flowId: "mock-flow",
			workspace: MOCK_WORKSPACE,
			runId: "run-1",
		});
		expect(result.output).toEqual({ mock: true, flowId: "mock-flow" });
		expect(events.some((e) => e.endsWith(":running"))).toBe(true);
		expect(events.some((e) => e.endsWith(":success"))).toBe(true);
	});

	test("isMockClientEnabled reads env flags", () => {
		expect(
			isMockClientEnabled({ VITE_QUESTER_CLIENT: "mock" } as ImportMetaEnv),
		).toBe(true);
		expect(
			isMockClientEnabled({ VITE_QUESTER_USE_MOCK: "1" } as ImportMetaEnv),
		).toBe(true);
		expect(isMockClientEnabled({} as ImportMetaEnv)).toBe(false);
	});
});
