import { describe, expect, test } from "bun:test";
import type { FlowV1 } from "@quester-studio/schema";
import {
	EDGE_INTERACTION_WIDTH,
	addNodeToFlow,
	deleteEdgesFromFlow,
	deleteNodesFromFlow,
	duplicateNodeInFlow,
	flowToReactFlow,
	isValidFlowConnection,
	reactFlowToFlow,
} from "./flowEditor.js";

const sampleFlow: FlowV1 = {
	version: "v1",
	id: "demo",
	name: "Demo",
	nodes: [
		{
			id: "http-1",
			type: "http",
			data: { label: "Login", method: "POST", url: "/login" },
			position: { x: 100, y: 80 },
		},
		{
			id: "extract-1",
			type: "extract",
			data: { label: "Token", expression: "body.token" },
			position: { x: 300, y: 80 },
		},
	],
	edges: [
		{ id: "e-1", source: "http-1", target: "extract-1", sourceHandle: null },
	],
};

describe("deleteNodesFromFlow", () => {
	test("removes node and connected edges", () => {
		const next = deleteNodesFromFlow(sampleFlow, ["http-1"]);
		expect(next.nodes.map((n) => n.id)).toEqual(["extract-1"]);
		expect(next.edges).toEqual([]);
	});

	test("does not delete start nodes", () => {
		const withStart: FlowV1 = {
			...sampleFlow,
			nodes: [
				{ id: "start", type: "start", data: { label: "Start" } },
				...sampleFlow.nodes,
			],
			edges: [
				{ id: "e0", source: "start", target: "http-1", sourceHandle: null },
				...sampleFlow.edges,
			],
		};
		const next = deleteNodesFromFlow(withStart, ["start", "http-1"]);
		expect(next.nodes.map((n) => n.id)).toEqual(["start", "extract-1"]);
	});
});

describe("deleteEdgesFromFlow", () => {
	test("removes only the edge", () => {
		const next = deleteEdgesFromFlow(sampleFlow, ["e-1"]);
		expect(next.nodes).toHaveLength(2);
		expect(next.edges).toEqual([]);
	});
});

describe("isValidFlowConnection", () => {
	const nodes = [
		{ id: "start", type: "start" },
		{ id: "a", type: "http" },
		{ id: "b", type: "http" },
	];

	test("rejects edges into start", () => {
		expect(
			isValidFlowConnection({
				source: "a",
				target: "start",
				nodes,
				edges: [],
			}),
		).toBe(false);
	});

	test("allows one outgoing from start", () => {
		expect(
			isValidFlowConnection({
				source: "start",
				target: "a",
				nodes,
				edges: [],
			}),
		).toBe(true);
	});

	test("blocks a second outgoing from start", () => {
		expect(
			isValidFlowConnection({
				source: "start",
				target: "b",
				nodes,
				edges: [{ id: "e0", source: "start" }],
			}),
		).toBe(false);
	});

	test("allows reconnecting the existing start edge", () => {
		expect(
			isValidFlowConnection({
				source: "start",
				target: "b",
				nodes,
				edges: [{ id: "e0", source: "start" }],
				ignoreEdgeId: "e0",
			}),
		).toBe(true);
	});

	test("allows normal node-to-node edges", () => {
		expect(
			isValidFlowConnection({
				source: "a",
				target: "b",
				nodes,
				edges: [],
			}),
		).toBe(true);
	});
});

describe("flowToReactFlow edges", () => {
	test("marks edges reconnectable with a wide hit target", () => {
		const { edges } = flowToReactFlow(sampleFlow);
		expect(edges[0]?.interactionWidth).toBe(EDGE_INTERACTION_WIDTH);
		expect(edges[0]?.reconnectable).toBe(true);
	});
});

describe("duplicateNodeInFlow", () => {
	test("clones node with offset and copy label", () => {
		const result = duplicateNodeInFlow(sampleFlow, "http-1");
		expect(result).not.toBeNull();
		if (!result) return;
		expect(result.flow.nodes).toHaveLength(3);
		const copy = result.flow.nodes.find((n) => n.id === result.newNodeId);
		expect(copy?.type).toBe("http");
		expect(copy?.position).toEqual({ x: 140, y: 120 });
		expect((copy?.data as { label?: string }).label).toBe("Login (copy)");
		expect(result.flow.edges).toHaveLength(1);
	});

	test("refuses to duplicate start", () => {
		const withStart: FlowV1 = {
			...sampleFlow,
			nodes: [{ id: "start", type: "start", data: { label: "Start" } }],
			edges: [],
		};
		expect(duplicateNodeInFlow(withStart, "start")).toBeNull();
	});

	test("preserves width and height when duplicating", () => {
		const withJson: FlowV1 = {
			...sampleFlow,
			nodes: [
				...sampleFlow.nodes,
				{
					id: "json-1",
					type: "json",
					data: { label: "Out" },
					position: { x: 400, y: 80 },
					width: 320,
					height: 240,
				},
			],
		};
		const result = duplicateNodeInFlow(withJson, "json-1");
		expect(result).not.toBeNull();
		if (!result) return;
		const copy = result.flow.nodes.find((n) => n.id === result.newNodeId);
		expect(copy?.width).toBe(320);
		expect(copy?.height).toBe(240);
	});
});

describe("json node size mapping", () => {
	test("addNodeToFlow sets default size for json nodes", () => {
		const next = addNodeToFlow(sampleFlow, "json", { x: 10, y: 20 });
		const json = next.nodes.find((n) => n.type === "json");
		expect(json?.width).toBe(280);
		expect(json?.height).toBe(220);
	});

	test("flowToReactFlow applies default size for json nodes", () => {
		const flow: FlowV1 = {
			...sampleFlow,
			nodes: [
				{
					id: "json-1",
					type: "json",
					data: { label: "JSON" },
					position: { x: 0, y: 0 },
				},
			],
			edges: [],
		};
		const { nodes } = flowToReactFlow(flow);
		expect(nodes[0]?.width).toBe(280);
		expect(nodes[0]?.height).toBe(220);
	});

	test("reactFlowToFlow persists width and height", () => {
		const flow: FlowV1 = {
			...sampleFlow,
			nodes: [
				{
					id: "json-1",
					type: "json",
					data: { label: "JSON" },
					position: { x: 0, y: 0 },
					width: 300,
					height: 200,
				},
			],
			edges: [],
		};
		const rf = flowToReactFlow(flow);
		const roundTrip = reactFlowToFlow(flow, rf.nodes, rf.edges);
		expect(roundTrip.nodes[0]?.width).toBe(300);
		expect(roundTrip.nodes[0]?.height).toBe(200);
	});
});
