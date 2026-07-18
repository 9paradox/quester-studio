import { describe, expect, test } from "bun:test";
import type { ExecuteFlowRpcResult } from "../../../shared/rpc.js";
import { resolveSelectedStep } from "./resolveStep.js";
import { parseAssertFailures } from "./types.js";

describe("resolveSelectedStep", () => {
	const baseResult = {
		ok: true,
		output: { done: true },
		nodeInputs: { a: { x: 1 }, b: { y: 2 } },
		nodeOutputs: { a: { out: 1 }, b: { out: 2 } },
		steps: [
			{ nodeId: "a", type: "http", input: { x: 1 }, output: { out: 1 } },
			{ nodeId: "b", type: "extract", input: { out: 1 }, output: 42 },
		],
		logs: [],
	} as unknown as ExecuteFlowRpcResult;

	test("returns null when no node selected", () => {
		expect(resolveSelectedStep(baseResult, null, null).selected).toBeNull();
	});

	test("finds step by selected node id", () => {
		const { selected } = resolveSelectedStep(baseResult, "b", {
			id: "b",
			type: "extract",
			data: {},
		});
		expect(selected?.nodeId).toBe("b");
		expect(selected?.type).toBe("extract");
		expect(selected?.output).toBe(42);
	});

	test("falls back to nodeInputs/nodeOutputs when steps empty", () => {
		const result = {
			...baseResult,
			steps: [],
		} as unknown as ExecuteFlowRpcResult;
		const { selected } = resolveSelectedStep(result, "a", {
			id: "a",
			type: "http",
			data: {},
		});
		expect(selected?.output).toEqual({ out: 1 });
		expect(selected?.type).toBe("http");
	});
});

describe("parseAssertFailures", () => {
	test("splits assertion failed messages", () => {
		expect(
			parseAssertFailures(
				"Assertion failed: status: expected 200, got 500; body.id: expected truthy value",
			),
		).toEqual([
			"status: expected 200, got 500",
			"body.id: expected truthy value",
		]);
	});

	test("returns empty for missing error", () => {
		expect(parseAssertFailures(undefined)).toEqual([]);
	});
});
