import { describe, expect, test } from "bun:test";
import type { FlowV1 } from "@quester-studio/schema";
import {
	computeLiveNodes,
	isNodeReady,
	selectNextEdges,
	topologicalSort,
} from "./graph.js";

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

	test("filters switch branches by arbitrary sourceHandle", () => {
		const switchFlow: FlowV1 = {
			id: "switch-test",
			version: "v1",
			nodes: [
				{ id: "in", type: "input", data: {} },
				{
					id: "sw",
					type: "switch",
					data: {
						expression: "x",
						cases: [
							{ value: "a", handle: "alpha" },
							{ value: "b", handle: "beta" },
						],
					},
				},
				{ id: "alpha", type: "set", data: {} },
				{ id: "beta", type: "set", data: {} },
				{ id: "fallback", type: "set", data: {} },
			],
			edges: [
				{ id: "e1", source: "in", target: "sw" },
				{ id: "e2", source: "sw", target: "alpha", sourceHandle: "alpha" },
				{ id: "e3", source: "sw", target: "beta", sourceHandle: "beta" },
				{
					id: "e4",
					source: "sw",
					target: "fallback",
					sourceHandle: "default",
				},
			],
		};
		const node = switchFlow.nodes.find((n) => n.id === "sw");
		if (!node) throw new Error("missing node");
		expect(
			selectNextEdges(switchFlow, node, "alpha").map((e) => e.target),
		).toEqual(["alpha"]);
		expect(
			selectNextEdges(switchFlow, node, "default").map((e) => e.target),
		).toEqual(["fallback"]);
	});

	test("filters try branches by sourceHandle", () => {
		const tryFlow: FlowV1 = {
			id: "try-test",
			version: "v1",
			nodes: [
				{ id: "in", type: "input", data: {} },
				{ id: "guard", type: "try", data: {} },
				{ id: "ok", type: "set", data: {} },
				{ id: "catch", type: "set", data: {} },
			],
			edges: [
				{ id: "e1", source: "in", target: "guard" },
				{ id: "e2", source: "guard", target: "ok", sourceHandle: "success" },
				{ id: "e3", source: "guard", target: "catch", sourceHandle: "failed" },
			],
		};
		const node = tryFlow.nodes.find((n) => n.id === "guard");
		if (!node) throw new Error("missing node");
		expect(
			selectNextEdges(tryFlow, node, "success").map((e) => e.target),
		).toEqual(["ok"]);
		expect(
			selectNextEdges(tryFlow, node, "failed").map((e) => e.target),
		).toEqual(["catch"]);
	});
});

describe("isNodeReady / computeLiveNodes", () => {
	const diamond: FlowV1 = {
		id: "diamond",
		version: "v1",
		nodes: [
			{ id: "start", type: "start", data: {} },
			{ id: "a", type: "set", data: { variables: { arm: "a" } } },
			{ id: "b", type: "set", data: { variables: { arm: "b" } } },
			{ id: "c", type: "set", data: { variables: { arm: "c" } } },
			{ id: "d", type: "merge", data: { sources: ["b", "c"] } },
		],
		edges: [
			{ id: "e0", source: "start", target: "a" },
			{ id: "e1", source: "a", target: "b" },
			{ id: "e2", source: "a", target: "c" },
			{ id: "e3", source: "b", target: "d" },
			{ id: "e4", source: "c", target: "d" },
		],
	};

	const xorRejoin: FlowV1 = {
		id: "xor",
		version: "v1",
		nodes: [
			{ id: "start", type: "start", data: {} },
			{ id: "check", type: "if", data: { condition: "true" } },
			{ id: "yes", type: "set", data: {} },
			{ id: "no", type: "set", data: {} },
			{ id: "out", type: "output", data: {} },
		],
		edges: [
			{ id: "e0", source: "start", target: "check" },
			{ id: "e1", source: "check", target: "yes", sourceHandle: "true" },
			{ id: "e2", source: "check", target: "no", sourceHandle: "false" },
			{ id: "e3", source: "yes", target: "out" },
			{ id: "e4", source: "no", target: "out" },
		],
	};

	test("diamond join waits for both arms", () => {
		const executed = new Set(["start", "a", "b"]);
		const branchTaken = new Map<string, string | undefined>([
			["start", undefined],
			["a", undefined],
			["b", undefined],
		]);
		expect(isNodeReady(diamond, "d", executed, branchTaken)).toBe(false);
		executed.add("c");
		branchTaken.set("c", undefined);
		expect(isNodeReady(diamond, "d", executed, branchTaken)).toBe(true);
	});

	test("xor rejoin does not wait for untaken arm", () => {
		const executed = new Set(["start", "check", "yes"]);
		const branchTaken = new Map<string, string | undefined>([
			["start", undefined],
			["check", "true"],
			["yes", undefined],
		]);
		const live = computeLiveNodes(xorRejoin, executed, branchTaken);
		expect(live.has("yes")).toBe(true);
		expect(live.has("no")).toBe(false);
		expect(isNodeReady(xorRejoin, "out", executed, branchTaken)).toBe(true);
	});
});
