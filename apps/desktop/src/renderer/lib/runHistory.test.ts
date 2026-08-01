import { afterEach, describe, expect, test } from "bun:test";
import type { ExecuteFlowRpcResult } from "../../shared/rpc.js";
import {
	MAX_RUN_HISTORY_PER_FLOW,
	RUN_HISTORY_STORAGE_KEY,
	appendRunHistory,
	clearRunHistory,
	findRunHistoryEntry,
	listRunHistory,
	truncateResultForHistory,
} from "./runHistory.js";

const memory = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
	value: {
		getItem(key: string) {
			return memory.has(key) ? (memory.get(key) ?? null) : null;
		},
		setItem(key: string, value: string) {
			memory.set(key, value);
		},
		removeItem(key: string) {
			memory.delete(key);
		},
		clear() {
			memory.clear();
		},
	},
	configurable: true,
});

afterEach(() => {
	memory.clear();
});

function sampleResult(overrides: Partial<ExecuteFlowRpcResult> = {}) {
	return {
		output: { ok: true },
		nodeOutputs: { n1: { body: "x".repeat(1000) } },
		nodeInputs: {},
		steps: [{ nodeId: "n1", type: "http", input: {}, output: {} }],
		vars: {},
		logs: [{ ts: 1, level: "info" as const, message: "done" }],
		...overrides,
	} satisfies ExecuteFlowRpcResult;
}

describe("runHistory", () => {
	test("truncateResultForHistory shortens large strings", () => {
		const truncated = truncateResultForHistory(
			sampleResult({
				nodeOutputs: { n1: { body: "x".repeat(2000) } },
			}),
		);
		const body = (truncated.nodeOutputs.n1 as { body: string }).body;
		expect(body.length).toBeLessThan(600);
		expect(body.endsWith("…")).toBe(true);
	});

	test("appendRunHistory keeps last N per flow", () => {
		for (let i = 0; i < MAX_RUN_HISTORY_PER_FLOW + 3; i += 1) {
			appendRunHistory({
				flowId: "flow-a",
				runId: `run-${i}`,
				ts: i,
				ok: true,
				result: sampleResult(),
			});
		}
		appendRunHistory({
			flowId: "flow-b",
			runId: "other",
			ts: 99,
			ok: true,
			result: sampleResult(),
		});

		const flowA = listRunHistory("flow-a");
		expect(flowA).toHaveLength(MAX_RUN_HISTORY_PER_FLOW);
		expect(flowA[0]?.runId).toBe(`run-${MAX_RUN_HISTORY_PER_FLOW + 2}`);
		expect(listRunHistory("flow-b")).toHaveLength(1);
		expect(findRunHistoryEntry("flow-b", "other")?.ts).toBe(99);
	});

	test("clearRunHistory removes one flow or all", () => {
		appendRunHistory({
			flowId: "a",
			runId: "1",
			ts: 1,
			ok: true,
			result: sampleResult(),
		});
		appendRunHistory({
			flowId: "b",
			runId: "2",
			ts: 2,
			ok: false,
			error: "fail",
			result: sampleResult({ error: "fail" }),
		});
		clearRunHistory("a");
		expect(listRunHistory("a")).toHaveLength(0);
		expect(listRunHistory("b")).toHaveLength(1);
		clearRunHistory();
		expect(memory.has(RUN_HISTORY_STORAGE_KEY)).toBe(false);
	});
});
