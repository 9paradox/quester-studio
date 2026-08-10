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
	writeAllEntries,
} from "./runHistory.js";

const memory = new Map<string, string>();
let maxBytes = Number.POSITIVE_INFINITY;

Object.defineProperty(globalThis, "localStorage", {
	value: {
		getItem(key: string) {
			return memory.has(key) ? (memory.get(key) ?? null) : null;
		},
		setItem(key: string, value: string) {
			if (value.length > maxBytes) {
				throw new DOMException(
					"Setting the value exceeded the quota.",
					"QuotaExceededError",
				);
			}
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
	maxBytes = Number.POSITIVE_INFINITY;
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
		expect(body.length).toBeLessThan(250);
		expect(body.endsWith("…")).toBe(true);
		expect(truncated.nodeInputs).toEqual({});
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

	test("writeAllEntries prunes oldest when quota exceeded", () => {
		const bulky = sampleResult({
			nodeOutputs: {
				n1: { body: "y".repeat(400) },
				n2: {
					items: Array.from({ length: 30 }, (_, i) => ({
						i,
						t: "z".repeat(80),
					})),
				},
			},
		});
		for (let i = 0; i < 8; i += 1) {
			appendRunHistory({
				flowId: "big",
				runId: `run-${i}`,
				ts: i,
				ok: true,
				result: truncateResultForHistory(bulky),
			});
		}
		const before = memory.get(RUN_HISTORY_STORAGE_KEY)?.length ?? 0;
		expect(before).toBeGreaterThan(1000);
		maxBytes = Math.floor(before * 0.4);
		writeAllEntries(
			JSON.parse(memory.get(RUN_HISTORY_STORAGE_KEY) ?? "[]") as ReturnType<
				typeof listRunHistory
			>,
		);
		const after = memory.get(RUN_HISTORY_STORAGE_KEY);
		expect(after).toBeTruthy();
		expect((after ?? "").length).toBeLessThanOrEqual(maxBytes);
		expect(listRunHistory("big").length).toBeGreaterThan(0);
		expect(listRunHistory("big").length).toBeLessThan(8);
	});
});
