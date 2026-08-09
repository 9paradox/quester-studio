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
		expect(none.issues.some((i) => i.suggestion?.includes("Add a Start"))).toBe(
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
		expect(
			result.issues.some((i) =>
				i.suggestion?.includes("Connect orphan from a reachable node"),
			),
		).toBe(true);
	});

	test("accepts disconnected note nodes", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [
					{ id: "start", type: "start", data: {} },
					{ id: "in", type: "input", data: {} },
					{ id: "sticky", type: "note", data: { text: "Remember TLS" } },
				],
				edges: [{ id: "e0", source: "start", target: "in" }],
			}),
		);
		expect(result.valid).toBe(true);
	});

	test("rejects edges involving note nodes", () => {
		const fromNote = validateFlowGraph(
			flow({
				nodes: [
					{ id: "start", type: "start", data: {} },
					{ id: "sticky", type: "note", data: { text: "" } },
					{ id: "in", type: "input", data: {} },
				],
				edges: [
					{ id: "e0", source: "start", target: "sticky" },
					{ id: "e1", source: "sticky", target: "in" },
				],
			}),
		);
		expect(fromNote.valid).toBe(false);
		expect(
			fromNote.issues.filter((i) =>
				i.message.includes("note nodes cannot be connected"),
			).length,
		).toBeGreaterThanOrEqual(1);

		const toNote = validateFlowGraph(
			flow({
				nodes: [
					{ id: "start", type: "start", data: {} },
					{ id: "in", type: "input", data: {} },
					{ id: "sticky", type: "note", data: { text: "" } },
				],
				edges: [
					{ id: "e0", source: "start", target: "in" },
					{ id: "e1", source: "in", target: "sticky" },
				],
			}),
		);
		expect(toNote.valid).toBe(false);
		expect(
			toNote.issues.some((i) =>
				i.message.includes("note nodes cannot be connected"),
			),
		).toBe(true);
	});

	test("accepts framed try with entry and exit", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [
					{ id: "start", type: "start", data: {} },
					{ id: "guard", type: "try", data: {}, width: 320, height: 240 },
					{
						id: "body",
						type: "set",
						data: { map: { x: "1" } },
						parentId: "guard",
						extent: "parent",
					},
					{ id: "after", type: "output", data: {} },
				],
				edges: [
					{ id: "e0", source: "start", target: "guard" },
					{
						id: "e1",
						source: "guard",
						target: "body",
						sourceHandle: "entry",
					},
					{
						id: "e2",
						source: "body",
						target: "guard",
						targetHandle: "exit",
					},
					{
						id: "e3",
						source: "guard",
						target: "after",
						sourceHandle: "success",
					},
				],
			}),
		);
		expect(result.valid).toBe(true);
	});

	test("rejects frame without entry/exit", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [
					{ id: "start", type: "start", data: {} },
					{ id: "guard", type: "try", data: {} },
					{ id: "body", type: "set", data: {}, parentId: "guard" },
				],
				edges: [{ id: "e0", source: "start", target: "guard" }],
			}),
		);
		expect(result.valid).toBe(false);
		expect(result.issues.some((i) => i.message.includes("entry edge"))).toBe(
			true,
		);
		expect(result.issues.some((i) => i.message.includes("exit edge"))).toBe(
			true,
		);
	});

	test("rejects edge that pierces into a frame child", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [
					{ id: "start", type: "start", data: {} },
					{ id: "guard", type: "try", data: {} },
					{ id: "body", type: "set", data: {}, parentId: "guard" },
					{ id: "out", type: "output", data: {} },
				],
				edges: [
					{ id: "e0", source: "start", target: "body" },
					{
						id: "e1",
						source: "guard",
						target: "body",
						sourceHandle: "entry",
					},
					{
						id: "e2",
						source: "body",
						target: "guard",
						targetHandle: "exit",
					},
					{
						id: "e3",
						source: "guard",
						target: "out",
						sourceHandle: "success",
					},
				],
			}),
		);
		expect(result.valid).toBe(false);
		expect(result.issues.some((i) => i.message.includes("enters frame"))).toBe(
			true,
		);
	});

	test("accepts framed foreach with complete handle", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [
					{ id: "start", type: "start", data: {} },
					{
						id: "loop",
						type: "foreach",
						data: { items: "ids" },
					},
					{
						id: "row",
						type: "template",
						data: { template: "{{item}}" },
						parentId: "loop",
					},
					{ id: "after", type: "output", data: {} },
				],
				edges: [
					{ id: "e0", source: "start", target: "loop" },
					{
						id: "e1",
						source: "loop",
						target: "row",
						sourceHandle: "entry",
					},
					{
						id: "e2",
						source: "row",
						target: "loop",
						targetHandle: "exit",
					},
					{
						id: "e3",
						source: "loop",
						target: "after",
						sourceHandle: "complete",
					},
				],
			}),
		);
		expect(result.valid).toBe(true);
	});

	test("rejects extract with two incoming edges", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [
					{ id: "start", type: "start", data: {} },
					{ id: "a", type: "set", data: { variables: { x: "1" } } },
					{ id: "b", type: "set", data: { variables: { y: "2" } } },
					{ id: "ex", type: "extract", data: { expression: "x" } },
					{ id: "out", type: "output", data: {} },
				],
				edges: [
					{ id: "e0", source: "start", target: "a" },
					{ id: "e1", source: "a", target: "b" },
					{ id: "e2", source: "a", target: "ex" },
					{ id: "e3", source: "b", target: "ex" },
					{ id: "e4", source: "ex", target: "out" },
				],
			}),
		);
		expect(result.valid).toBe(false);
		expect(
			result.issues.some(
				(i) =>
					i.message.includes("at most one incoming") &&
					i.suggestion?.includes("join"),
			),
		).toBe(true);
	});

	test("allows join with multiple incoming edges", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [
					{ id: "start", type: "start", data: {} },
					{ id: "a", type: "set", data: { variables: { x: "1" } } },
					{ id: "b", type: "template", data: { template: "from-b" } },
					{ id: "c", type: "template", data: { template: "from-c" } },
					{ id: "j", type: "join", data: {} },
					{ id: "out", type: "output", data: {} },
				],
				edges: [
					{ id: "e0", source: "start", target: "a" },
					{ id: "e1", source: "a", target: "b" },
					{ id: "e2", source: "a", target: "c" },
					{ id: "e3", source: "b", target: "j" },
					{ id: "e4", source: "c", target: "j" },
					{ id: "e5", source: "j", target: "out" },
				],
			}),
		);
		expect(result.valid).toBe(true);
	});

	test("try outer+exit edges do not trip max-one-in", () => {
		const result = validateFlowGraph(
			flow({
				nodes: [
					{ id: "start", type: "start", data: {} },
					{ id: "guard", type: "try", data: {} },
					{
						id: "body",
						type: "set",
						data: {},
						parentId: "guard",
						extent: "parent",
					},
					{ id: "out", type: "output", data: {} },
				],
				edges: [
					{ id: "e0", source: "start", target: "guard" },
					{
						id: "e1",
						source: "guard",
						target: "body",
						sourceHandle: "entry",
					},
					{
						id: "e2",
						source: "body",
						target: "guard",
						targetHandle: "exit",
					},
					{
						id: "e3",
						source: "guard",
						target: "out",
						sourceHandle: "success",
					},
				],
			}),
		);
		expect(result.valid).toBe(true);
	});

	test("rejects multiple entry or exit edges on a frame", () => {
		const multiEntry = validateFlowGraph(
			flow({
				nodes: [
					{ id: "start", type: "start", data: {} },
					{ id: "guard", type: "try", data: {} },
					{ id: "a", type: "set", data: {}, parentId: "guard" },
					{ id: "b", type: "set", data: {}, parentId: "guard" },
					{ id: "out", type: "output", data: {} },
				],
				edges: [
					{ id: "e0", source: "start", target: "guard" },
					{
						id: "e1",
						source: "guard",
						target: "a",
						sourceHandle: "entry",
					},
					{
						id: "e2",
						source: "guard",
						target: "b",
						sourceHandle: "entry",
					},
					{
						id: "e3",
						source: "a",
						target: "guard",
						targetHandle: "exit",
					},
					{
						id: "e4",
						source: "guard",
						target: "out",
						sourceHandle: "success",
					},
				],
			}),
		);
		expect(multiEntry.valid).toBe(false);
		expect(
			multiEntry.issues.some((i) => i.message.includes("only one entry")),
		).toBe(true);

		const multiExit = validateFlowGraph(
			flow({
				nodes: [
					{ id: "start", type: "start", data: {} },
					{ id: "guard", type: "try", data: {} },
					{ id: "a", type: "set", data: {}, parentId: "guard" },
					{ id: "b", type: "set", data: {}, parentId: "guard" },
					{ id: "out", type: "output", data: {} },
				],
				edges: [
					{ id: "e0", source: "start", target: "guard" },
					{
						id: "e1",
						source: "guard",
						target: "a",
						sourceHandle: "entry",
					},
					{ id: "e2", source: "a", target: "b" },
					{
						id: "e3",
						source: "a",
						target: "guard",
						targetHandle: "exit",
					},
					{
						id: "e4",
						source: "b",
						target: "guard",
						targetHandle: "exit",
					},
					{
						id: "e5",
						source: "guard",
						target: "out",
						sourceHandle: "success",
					},
				],
			}),
		);
		expect(multiExit.valid).toBe(false);
		expect(
			multiExit.issues.some((i) => i.message.includes("only one exit")),
		).toBe(true);
	});
});
