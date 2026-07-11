import { describe, expect, test } from "bun:test";
import type { FlowV1 } from "@quester/schema";
import { selectNextEdges, topologicalSort } from "./graph.js";

const flow: FlowV1 = {
	id: "test",
	version: "v1",
	nodes: [
		{ id: "in", type: "input", data: {} },
		{ id: "if", type: "if", data: { condition: "true" } },
		{ id: "yes", type: "set", data: {} },
		{ id: "no", type: "set", data: {} },
	],
	edges: [
		{ id: "e1", source: "in", target: "if" },
		{ id: "e2", source: "if", target: "yes", sourceHandle: "true" },
		{ id: "e3", source: "if", target: "no", sourceHandle: "false" },
	],
};

describe("topologicalSort", () => {
	test("orders nodes respecting edges", () => {
		const order = topologicalSort(flow).map((n) => n.id);
		expect(order.indexOf("in")).toBeLessThan(order.indexOf("if"));
		expect(order.indexOf("if")).toBeLessThan(order.indexOf("yes"));
		expect(order.indexOf("if")).toBeLessThan(order.indexOf("no"));
	});
});

describe("selectNextEdges", () => {
	test("returns all outgoing edges for non-if nodes", () => {
		const node = flow.nodes.find((n) => n.id === "in");
		if (!node) throw new Error("missing node");
		expect(selectNextEdges(flow, node).map((e) => e.target)).toEqual(["if"]);
	});

	test("filters if branches by sourceHandle", () => {
		const node = flow.nodes.find((n) => n.id === "if");
		if (!node) throw new Error("missing node");
		expect(selectNextEdges(flow, node, "true").map((e) => e.target)).toEqual([
			"yes",
		]);
		expect(selectNextEdges(flow, node, "false").map((e) => e.target)).toEqual([
			"no",
		]);
	});
});
