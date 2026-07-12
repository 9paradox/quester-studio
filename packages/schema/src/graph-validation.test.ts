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
	test("accepts a valid linear flow with start", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [
					{ id: "start", type: "start", data: {} },
					{ id: "in", type: "input", data: {} },
					{ id: "out", type: "output", data: {} },
				],
				edges: [
					{ id: "e0", source: "start", target: "in" },
					{ id: "e1", source: "in", target: "out" },
				],
			}),
		);
		expect(result.valid).toBe(true);
		expect(result.issues).toHaveLength(0);
	});

	test("requires exactly one start node", () => {
		const none = validateFlowGraph(
			flow({
				nodes: [{ id: "out", type: "output", data: {} }],
			}),
		);
		expect(none.valid).toBe(false);
		expect(none.issues.some((i) => i.message.includes("start node"))).toBe(
			true,
		);

		const many = validateFlowGraph(
			flow({
				nodes: [
					{ id: "s1", type: "start", data: {} },
					{ id: "s2", type: "start", data: {} },
				],
			}),
		);
		expect(many.valid).toBe(false);
		expect(many.issues.some((i) => i.message.includes("exactly one"))).toBe(
			true,
		);
	});

	test("rejects start with multiple children", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [
					{ id: "start", type: "start", data: {} },
					{ id: "a", type: "http", data: { url: "https://a.example" } },
					{ id: "b", type: "http", data: { url: "https://b.example" } },
				],
				edges: [
					{ id: "e1", source: "start", target: "a" },
					{ id: "e2", source: "start", target: "b" },
				],
			}),
		);
		expect(result.valid).toBe(false);
		expect(
			result.issues.some((i) => i.message.includes("at most one outgoing")),
		).toBe(true);
	});

	test("rejects start with incoming edges", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [
					{ id: "start", type: "start", data: {} },
					{ id: "in", type: "input", data: {} },
				],
				edges: [{ id: "e1", source: "in", target: "start" }],
			}),
		);
		expect(result.valid).toBe(false);
		expect(
			result.issues.some((i) => i.message.includes("incoming edges")),
		).toBe(true);
	});

	test("rejects unknown edge endpoints", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [{ id: "start", type: "start", data: {} }],
				edges: [{ id: "e1", source: "start", target: "missing" }],
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
					{ id: "start", type: "start", data: {} },
					{ id: "a", type: "set", data: {} },
					{ id: "b", type: "set", data: {} },
				],
				edges: [
					{ id: "e0", source: "start", target: "a" },
					{ id: "e2", source: "a", target: "b" },
					{ id: "e3", source: "b", target: "a" },
				],
			}),
		);
		expect(result.valid).toBe(false);
		expect(result.issues.some((i) => i.message.includes("cycle"))).toBe(true);
	});

	test("rejects nodes unreachable from start", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [
					{ id: "start", type: "start", data: {} },
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
