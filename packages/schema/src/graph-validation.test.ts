import { describe, expect, test } from "bun:test";
import type { FlowV1 } from "./flow.js";
import { validateFlowGraph } from "./graph-validation.js";

function flow(overrides: Partial<FlowV1> & Pick<FlowV1, "nodes">): FlowV1 {
	return {
		id: "test",
		version: "v1",
		edges: [],
		...overrides,
	};
}

describe("validateFlowGraph", () => {
	test("accepts a valid linear flow", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [
					{ id: "in", type: "input", data: {} },
					{ id: "out", type: "output", data: {} },
				],
				edges: [{ id: "e1", source: "in", target: "out" }],
			}),
		);
		expect(result.valid).toBe(true);
		expect(result.issues).toHaveLength(0);
	});

	test("requires at least one input node", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [{ id: "out", type: "output", data: {} }],
			}),
		);
		expect(result.valid).toBe(false);
		expect(result.issues.some((i) => i.message.includes("input node"))).toBe(
			true,
		);
	});

	test("rejects unknown edge endpoints", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [{ id: "in", type: "input", data: {} }],
				edges: [{ id: "e1", source: "in", target: "missing" }],
			}),
		);
		expect(result.valid).toBe(false);
		expect(
			result.issues.some((i) => i.message.includes("Unknown target")),
		).toBe(true);
	});

	test("rejects cycles", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [
					{ id: "in", type: "input", data: {} },
					{ id: "a", type: "set", data: {} },
					{ id: "b", type: "set", data: {} },
				],
				edges: [
					{ id: "e1", source: "in", target: "a" },
					{ id: "e2", source: "a", target: "b" },
					{ id: "e3", source: "b", target: "a" },
				],
			}),
		);
		expect(result.valid).toBe(false);
		expect(result.issues.some((i) => i.message.includes("cycle"))).toBe(true);
	});

	test("rejects nodes unreachable from input", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [
					{ id: "in", type: "input", data: {} },
					{ id: "orphan", type: "output", data: {} },
				],
			}),
		);
		expect(result.valid).toBe(false);
		expect(result.issues.some((i) => i.message.includes("not reachable"))).toBe(
			true,
		);
	});
});
