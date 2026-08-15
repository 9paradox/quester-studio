import { describe, expect, test } from "bun:test";
import type { FlowV1 } from "@quester-studio/schema";
import {
	EDGE_INTERACTION_WIDTH,
	addNodeToFlow,
	alignNodes,
	deleteEdgesFromFlow,
	deleteNodesFromFlow,
	distributeNodes,
	duplicateNodeInFlow,
	ensureFrameBodyWiring,
	findFrameAtPoint,
	flowToReactFlow,
	isValidFlowConnection,
	mergeLiveReactFlowNode,
	pruneRedundantFrameWiring,
	reactFlowToFlow,
	reparentNodeInFlow,
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

	test("rejects edges involving note nodes", () => {
		const withNote = [...nodes, { id: "sticky", type: "note" }];
		expect(
			isValidFlowConnection({
				source: "a",
				target: "sticky",
				nodes: withNote,
				edges: [],
			}),
		).toBe(false);
		expect(
			isValidFlowConnection({
				source: "sticky",
				target: "a",
				nodes: withNote,
				edges: [],
			}),
		).toBe(false);
	});

	test("rejects a second incoming edge except on join", () => {
		expect(
			isValidFlowConnection({
				source: "b",
				target: "a",
				nodes,
				edges: [{ id: "e0", source: "start", target: "a" }],
			}),
		).toBe(false);

		const withJoin = [...nodes, { id: "j", type: "join" }];
		expect(
			isValidFlowConnection({
				source: "b",
				target: "j",
				nodes: withJoin,
				edges: [{ id: "e0", source: "a", target: "j" }],
			}),
		).toBe(true);
	});

	test("allows frame exit when outer wire already exists", () => {
		const framed = [
			{ id: "start", type: "start" },
			{ id: "guard", type: "try" },
			{ id: "body", type: "http", parentId: "guard" },
		];
		expect(
			isValidFlowConnection({
				source: "body",
				target: "guard",
				targetHandle: "exit",
				nodes: framed,
				edges: [{ id: "e0", source: "start", target: "guard" }],
			}),
		).toBe(true);
	});

	test("rejects a second frame entry or exit edge", () => {
		const framed = [
			{ id: "guard", type: "try" },
			{ id: "a", type: "http", parentId: "guard" },
			{ id: "b", type: "extract", parentId: "guard" },
		];
		expect(
			isValidFlowConnection({
				source: "guard",
				target: "b",
				sourceHandle: "entry",
				nodes: framed,
				edges: [
					{
						id: "e-entry",
						source: "guard",
						target: "a",
						sourceHandle: "entry",
					},
				],
			}),
		).toBe(false);
		expect(
			isValidFlowConnection({
				source: "b",
				target: "guard",
				targetHandle: "exit",
				nodes: framed,
				edges: [
					{
						id: "e-exit",
						source: "a",
						target: "guard",
						targetHandle: "exit",
					},
				],
			}),
		).toBe(false);
	});

	test("rejects body sibling cycles", () => {
		const framed = [
			{ id: "guard", type: "try" },
			{ id: "http", type: "http", parentId: "guard" },
			{ id: "ex", type: "extract", parentId: "guard" },
		];
		expect(
			isValidFlowConnection({
				source: "ex",
				target: "http",
				nodes: framed,
				edges: [{ id: "e-http-ex", source: "http", target: "ex" }],
			}),
		).toBe(false);
		// Linear chain still allowed
		expect(
			isValidFlowConnection({
				source: "http",
				target: "ex",
				nodes: framed,
				edges: [
					{
						id: "e-entry",
						source: "guard",
						target: "http",
						sourceHandle: "entry",
					},
				],
			}),
		).toBe(true);
	});

	test("allows nested try success → parent foreach exit", () => {
		const nodes = [
			{ id: "loop", type: "foreach" },
			{ id: "guard", type: "try", parentId: "loop" },
			{ id: "row", type: "template", parentId: "guard" },
		];
		expect(
			isValidFlowConnection({
				source: "guard",
				target: "loop",
				sourceHandle: "success",
				targetHandle: "exit",
				nodes,
				edges: [
					{
						id: "e-entry",
						source: "loop",
						target: "guard",
						sourceHandle: "entry",
						targetHandle: "in",
					},
				],
			}),
		).toBe(true);
		expect(
			isValidFlowConnection({
				source: "guard",
				target: "loop",
				sourceHandle: "failed",
				targetHandle: "exit",
				nodes,
				edges: [
					{
						id: "e-entry",
						source: "loop",
						target: "guard",
						sourceHandle: "entry",
						targetHandle: "in",
					},
				],
			}),
		).toBe(true);
	});
});

describe("ensureFrameBodyWiring", () => {
	test("skips entry when child already has sibling predecessor", () => {
		const flow: FlowV1 = {
			version: "v1",
			id: "f",
			nodes: [
				{ id: "guard", type: "try", data: {}, position: { x: 0, y: 0 } },
				{
					id: "http",
					type: "http",
					data: {},
					parentId: "guard",
					extent: "parent",
					position: { x: 20, y: 40 },
				},
				{
					id: "ex",
					type: "extract",
					data: {},
					parentId: "guard",
					extent: "parent",
					position: { x: 20, y: 120 },
				},
			],
			edges: [
				{
					id: "e-http-ex",
					source: "http",
					target: "ex",
				},
			],
		};
		const wired = ensureFrameBodyWiring(flow, "guard", "ex");
		expect(
			wired.edges.some((e) => e.source === "guard" && e.target === "ex"),
		).toBe(false);
		expect(
			wired.edges.some((e) => e.source === "ex" && e.target === "guard"),
		).toBe(true);

		const withBoth = {
			...flow,
			edges: [
				...flow.edges,
				{
					id: "e-entry-ex",
					source: "guard",
					target: "ex",
					sourceHandle: "entry",
				},
				{
					id: "e-http-exit",
					source: "http",
					target: "guard",
					targetHandle: "exit",
				},
			],
		};
		const pruned = pruneRedundantFrameWiring(withBoth, "http", "ex");
		expect(pruned.edges.some((e) => e.id === "e-entry-ex")).toBe(false);
		expect(pruned.edges.some((e) => e.id === "e-http-exit")).toBe(false);
		expect(pruned.edges.some((e) => e.id === "e-http-ex")).toBe(true);
		// Exit moved from http → frame onto ex → frame
		expect(
			pruned.edges.some(
				(e) =>
					e.source === "ex" &&
					e.target === "guard" &&
					e.targetHandle === "exit",
			),
		).toBe(true);
	});

	test("does not add a second entry when the frame already has one", () => {
		const flow: FlowV1 = {
			version: "v1",
			id: "f",
			nodes: [
				{ id: "guard", type: "try", data: {}, position: { x: 0, y: 0 } },
				{
					id: "http",
					type: "http",
					data: {},
					parentId: "guard",
					extent: "parent",
					position: { x: 20, y: 40 },
				},
				{
					id: "ex",
					type: "extract",
					data: {},
					parentId: "guard",
					extent: "parent",
					position: { x: 20, y: 120 },
				},
			],
			edges: [
				{
					id: "e-entry-http",
					source: "guard",
					target: "http",
					sourceHandle: "entry",
				},
				{
					id: "e-http-exit",
					source: "http",
					target: "guard",
					targetHandle: "exit",
				},
			],
		};
		const wired = ensureFrameBodyWiring(flow, "guard", "ex");
		expect(
			wired.edges.filter(
				(e) => e.source === "guard" && e.sourceHandle === "entry",
			),
		).toHaveLength(1);
		expect(
			wired.edges.filter(
				(e) => e.target === "guard" && e.targetHandle === "exit",
			),
		).toHaveLength(1);
	});
});

describe("reparentNodeInFlow / findFrameAtPoint", () => {
	const framedBase: FlowV1 = {
		version: "v1",
		id: "f",
		nodes: [
			{ id: "start", type: "start", data: {}, position: { x: 0, y: 0 } },
			{
				id: "guard",
				type: "try",
				data: {},
				position: { x: 100, y: 100 },
				width: 320,
				height: 240,
			},
			{
				id: "http",
				type: "http",
				data: {},
				position: { x: 500, y: 120 },
			},
		],
		edges: [{ id: "e0", source: "start", target: "guard" }],
	};

	test("reparents into a frame with relative position and entry/exit", () => {
		const next = reparentNodeInFlow(framedBase, "http", "guard", {
			x: 140,
			y: 160,
		});
		const child = next.nodes.find((n) => n.id === "http");
		expect(child?.parentId).toBe("guard");
		expect(child?.extent).toBe("parent");
		expect(child?.position).toEqual({ x: 40, y: 60 });
		expect(
			next.edges.some(
				(e) =>
					e.source === "guard" &&
					e.target === "http" &&
					e.sourceHandle === "entry",
			),
		).toBe(true);
		expect(
			next.edges.some(
				(e) =>
					e.source === "http" &&
					e.target === "guard" &&
					e.targetHandle === "exit",
			),
		).toBe(true);
	});

	test("clears parent and drops entry/exit edges", () => {
		const inside = reparentNodeInFlow(framedBase, "http", "guard", {
			x: 140,
			y: 160,
		});
		const out = reparentNodeInFlow(inside, "http", null, { x: 700, y: 300 });
		const child = out.nodes.find((n) => n.id === "http");
		expect(child?.parentId).toBeUndefined();
		expect(child?.position).toEqual({ x: 700, y: 300 });
		expect(
			out.edges.some(
				(e) =>
					(e.source === "guard" && e.target === "http") ||
					(e.source === "http" && e.target === "guard"),
			),
		).toBe(false);
	});

	test("findFrameAtPoint prefers the smallest containing frame", () => {
		const flow: FlowV1 = {
			version: "v1",
			id: "f",
			nodes: [
				{
					id: "big",
					type: "foreach",
					data: { items: "[]" },
					position: { x: 0, y: 0 },
					width: 600,
					height: 400,
				},
				{
					id: "small",
					type: "try",
					data: {},
					position: { x: 50, y: 50 },
					width: 200,
					height: 160,
				},
			],
			edges: [],
		};
		expect(findFrameAtPoint(flow, { x: 100, y: 100 })).toBe("small");
		expect(findFrameAtPoint(flow, { x: 500, y: 300 })).toBe("big");
		expect(findFrameAtPoint(flow, { x: 900, y: 900 })).toBeNull();
		expect(findFrameAtPoint(flow, { x: 100, y: 100 }, "small")).toBe("big");
	});

	test("reparents try into foreach and foreach into try", () => {
		const flow: FlowV1 = {
			version: "v1",
			id: "f",
			nodes: [
				{ id: "start", type: "start", data: {}, position: { x: 0, y: 0 } },
				{
					id: "loop",
					type: "foreach",
					data: { items: "[]" },
					position: { x: 100, y: 100 },
					width: 480,
					height: 360,
				},
				{
					id: "guard",
					type: "try",
					data: {},
					position: { x: 700, y: 120 },
					width: 280,
					height: 200,
				},
			],
			edges: [{ id: "e0", source: "start", target: "loop" }],
		};
		const nested = reparentNodeInFlow(flow, "guard", "loop", {
			x: 160,
			y: 180,
		});
		const guard = nested.nodes.find((n) => n.id === "guard");
		expect(guard?.parentId).toBe("loop");
		expect(guard?.extent).toBe("parent");
		expect(guard?.position).toEqual({ x: 60, y: 80 });
		expect(
			nested.edges.some(
				(e) =>
					e.source === "loop" &&
					e.target === "guard" &&
					e.sourceHandle === "entry" &&
					e.targetHandle === "in",
			),
		).toBe(true);
		expect(
			nested.edges.some(
				(e) =>
					e.source === "guard" &&
					e.target === "loop" &&
					e.sourceHandle === "success" &&
					e.targetHandle === "exit",
			),
		).toBe(true);

		const empty: FlowV1 = {
			version: "v1",
			id: "f2",
			nodes: [
				{ id: "start", type: "start", data: {}, position: { x: 0, y: 0 } },
				{
					id: "outer",
					type: "try",
					data: {},
					position: { x: 40, y: 40 },
					width: 500,
					height: 400,
				},
				{
					id: "inner",
					type: "foreach",
					data: { items: "[]" },
					position: { x: 600, y: 80 },
					width: 260,
					height: 200,
				},
			],
			edges: [{ id: "e0", source: "start", target: "outer" }],
		};
		const nestedLoop = reparentNodeInFlow(empty, "inner", "outer", {
			x: 100,
			y: 120,
		});
		expect(nestedLoop.nodes.find((n) => n.id === "inner")?.parentId).toBe(
			"outer",
		);
	});

	test("refuses reparenting a frame onto its descendant", () => {
		const flow: FlowV1 = {
			version: "v1",
			id: "f",
			nodes: [
				{
					id: "outer",
					type: "foreach",
					data: { items: "[]" },
					position: { x: 0, y: 0 },
					width: 500,
					height: 400,
				},
				{
					id: "inner",
					type: "try",
					data: {},
					parentId: "outer",
					extent: "parent",
					position: { x: 40, y: 40 },
					width: 240,
					height: 180,
				},
			],
			edges: [],
		};
		const next = reparentNodeInFlow(flow, "outer", "inner", { x: 50, y: 50 });
		expect(next.nodes.find((n) => n.id === "outer")?.parentId).toBeUndefined();
	});

	test("findFrameAtPoint prefers deepest nested frame", () => {
		const flow: FlowV1 = {
			version: "v1",
			id: "f",
			nodes: [
				{
					id: "outer",
					type: "foreach",
					data: { items: "[]" },
					position: { x: 0, y: 0 },
					width: 600,
					height: 400,
				},
				{
					id: "inner",
					type: "try",
					data: {},
					parentId: "outer",
					extent: "parent",
					position: { x: 50, y: 50 },
					width: 220,
					height: 180,
				},
			],
			edges: [],
		};
		expect(findFrameAtPoint(flow, { x: 100, y: 100 })).toBe("inner");
		expect(findFrameAtPoint(flow, { x: 500, y: 300 })).toBe("outer");
		expect(findFrameAtPoint(flow, { x: 100, y: 100 }, "inner")).toBe("outer");
		expect(findFrameAtPoint(flow, { x: 100, y: 100 }, "outer")).toBeNull();
	});

	test("clears nested frame parent and drops body wiring", () => {
		const flow: FlowV1 = {
			version: "v1",
			id: "f",
			nodes: [
				{
					id: "loop",
					type: "foreach",
					data: { items: "[]" },
					position: { x: 0, y: 0 },
					width: 500,
					height: 400,
				},
				{
					id: "guard",
					type: "try",
					data: {},
					position: { x: 600, y: 40 },
					width: 280,
					height: 200,
				},
			],
			edges: [],
		};
		const inside = reparentNodeInFlow(flow, "guard", "loop", {
			x: 80,
			y: 100,
		});
		const out = reparentNodeInFlow(inside, "guard", null, { x: 700, y: 80 });
		const guard = out.nodes.find((n) => n.id === "guard");
		expect(guard?.parentId).toBeUndefined();
		expect(guard?.position).toEqual({ x: 700, y: 80 });
		expect(
			out.edges.some(
				(e) =>
					(e.source === "loop" && e.target === "guard") ||
					(e.source === "guard" && e.target === "loop"),
			),
		).toBe(false);
	});

	test("addNodeToFlow + reparent drop parents into frame", () => {
		const base: FlowV1 = {
			version: "v1",
			id: "f",
			nodes: [
				{ id: "start", type: "start", data: {}, position: { x: 0, y: 0 } },
				{
					id: "loop",
					type: "foreach",
					data: { items: "[]" },
					position: { x: 100, y: 100 },
					width: 400,
					height: 300,
				},
			],
			edges: [{ id: "e0", source: "start", target: "loop" }],
		};
		const dropAt = { x: 180, y: 180 };
		const withTry = addNodeToFlow(base, "try", dropAt);
		const created = withTry.nodes[withTry.nodes.length - 1];
		expect(created?.type).toBe("try");
		const frameId = findFrameAtPoint(withTry, dropAt, created?.id);
		expect(frameId).toBe("loop");
		const nested = reparentNodeInFlow(
			withTry,
			created?.id ?? "",
			frameId,
			dropAt,
		);
		expect(nested.nodes.find((n) => n.id === created?.id)?.parentId).toBe(
			"loop",
		);
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

	test("addNodeToFlow sets default size for note nodes", () => {
		const next = addNodeToFlow(sampleFlow, "note", { x: 10, y: 20 });
		const note = next.nodes.find((n) => n.type === "note");
		expect(note?.width).toBe(240);
		expect(note?.height).toBe(160);
		expect(note?.data).toEqual({ label: "Note", text: "", fontSize: 12 });
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

	test("flowToReactFlow does not freeze content-sized http nodes to a stored box", () => {
		const flow: FlowV1 = {
			...sampleFlow,
			nodes: [
				{
					id: "http-1",
					type: "http",
					data: { label: "GET product" },
					position: { x: 0, y: 0 },
					width: 150,
					height: 40,
				},
			],
			edges: [],
		};
		const rf = flowToReactFlow(flow);
		expect(rf.nodes[0]?.width).toBeUndefined();
		expect(rf.nodes[0]?.height).toBeUndefined();
		expect(rf.nodes[0]?.style?.width).toBeUndefined();
		expect(rf.nodes[0]?.style?.height).toBeUndefined();
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

	test("reactFlowToFlow does not persist measured size for http nodes", () => {
		const flow: FlowV1 = {
			...sampleFlow,
			nodes: [
				{
					id: "http-1",
					type: "http",
					data: {},
					position: { x: 0, y: 0 },
				},
			],
			edges: [],
		};
		const roundTrip = reactFlowToFlow(
			flow,
			[
				{
					id: "http-1",
					type: "http",
					position: { x: 0, y: 0 },
					data: {},
					width: 248,
					height: 96,
				},
			],
			[],
		);
		expect(roundTrip.nodes[0]?.width).toBeUndefined();
		expect(roundTrip.nodes[0]?.height).toBeUndefined();
	});

	test("mergeLiveReactFlowNode keeps measured size for the selection bounds box", () => {
		const mapped = flowToReactFlow(sampleFlow).nodes[1];
		expect(mapped).toBeDefined();
		if (!mapped) return;
		const existing = {
			...mapped,
			width: 248,
			height: 96,
			position: { x: 40, y: 80 },
			positionAbsolute: { x: 40, y: 80 },
			selected: true,
		};
		const merged = mergeLiveReactFlowNode(mapped, existing);
		expect(merged.width).toBe(248);
		expect(merged.height).toBe(96);
		expect(merged.position).toEqual({ x: 40, y: 80 });
		expect(merged.selected).toBe(true);
		expect(merged.positionAbsolute).toEqual({ x: 40, y: 80 });
	});

	test("mergeLiveReactFlowNode prefers explicit flow sizes over live measure", () => {
		const mapped = {
			id: "json-1",
			type: "json",
			position: { x: 0, y: 0 },
			data: {},
			width: 320,
			height: 240,
		};
		const existing = {
			...mapped,
			width: 200,
			height: 100,
			selected: false,
		};
		const merged = mergeLiveReactFlowNode(mapped, existing);
		expect(merged.width).toBe(320);
		expect(merged.height).toBe(240);
	});

	test("round-trips parentId, extent, and targetHandle", () => {
		const flow: FlowV1 = {
			version: "v1",
			id: "framed",
			nodes: [
				{ id: "start", type: "start", data: {}, position: { x: 0, y: 0 } },
				{
					id: "guard",
					type: "try",
					data: { label: "Try" },
					position: { x: 100, y: 0 },
					width: 320,
					height: 240,
				},
				{
					id: "body",
					type: "set",
					data: {},
					parentId: "guard",
					extent: "parent",
					position: { x: 40, y: 60 },
				},
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
			],
		};
		const rf = flowToReactFlow(flow);
		expect(rf.nodes.find((n) => n.id === "body")?.parentId).toBe("guard");
		expect(rf.nodes.find((n) => n.id === "body")?.extent).toBe("parent");
		expect(rf.nodes.find((n) => n.id === "guard")?.width).toBe(320);
		expect(rf.edges.find((e) => e.id === "e2")?.targetHandle).toBe("exit");
		const roundTrip = reactFlowToFlow(flow, rf.nodes, rf.edges);
		expect(roundTrip.nodes.find((n) => n.id === "body")?.parentId).toBe(
			"guard",
		);
		expect(roundTrip.edges.find((e) => e.id === "e2")?.targetHandle).toBe(
			"exit",
		);
	});

	test("places parent frames before body children", () => {
		const flow: FlowV1 = {
			version: "v1",
			id: "order",
			nodes: [
				{
					id: "body",
					type: "http",
					data: {},
					parentId: "guard",
					extent: "parent",
					position: { x: 20, y: 40 },
				},
				{
					id: "guard",
					type: "try",
					data: {},
					position: { x: 0, y: 0 },
					width: 320,
					height: 240,
				},
			],
			edges: [],
		};
		const { nodes } = flowToReactFlow(flow);
		expect(nodes.map((n) => n.id)).toEqual(["guard", "body"]);
		expect(nodes[0]?.zIndex).toBe(0);
		expect(nodes[1]?.zIndex).toBe(1);
	});
});

describe("alignNodes / distributeNodes", () => {
	const three: FlowV1 = {
		version: "v1",
		id: "align",
		name: "Align",
		nodes: [
			{
				id: "a",
				type: "http",
				data: { label: "A", method: "GET", url: "/" },
				position: { x: 0, y: 10 },
				width: 100,
			},
			{
				id: "b",
				type: "http",
				data: { label: "B", method: "GET", url: "/" },
				position: { x: 40, y: 80 },
				width: 100,
			},
			{
				id: "c",
				type: "http",
				data: { label: "C", method: "GET", url: "/" },
				position: { x: 200, y: 30 },
				width: 100,
			},
		],
		edges: [],
	};

	test("align left sets shared x", () => {
		const next = alignNodes(three, ["a", "b", "c"], "left");
		expect(next.nodes.map((n) => n.position?.x)).toEqual([0, 0, 0]);
		expect(next.nodes.find((n) => n.id === "b")?.position?.y).toBe(80);
	});

	test("align right uses widths", () => {
		const next = alignNodes(three, ["a", "c"], "right");
		const a = next.nodes.find((n) => n.id === "a");
		const c = next.nodes.find((n) => n.id === "c");
		expect((a?.position?.x ?? 0) + (a?.width ?? 0)).toBe(300);
		expect((c?.position?.x ?? 0) + (c?.width ?? 0)).toBe(300);
	});

	test("distribute horizontal spaces evenly", () => {
		const next = distributeNodes(three, ["a", "b", "c"], "horizontal");
		const xs = ["a", "b", "c"].map(
			(id) => next.nodes.find((n) => n.id === id)?.position?.x,
		);
		expect(xs[0]).toBe(0);
		expect(xs[2]).toBe(200);
		expect(xs[1]).toBe(100);
	});

	test("noop when fewer than required nodes", () => {
		expect(alignNodes(three, ["a"], "left")).toBe(three);
		expect(distributeNodes(three, ["a", "b"], "horizontal")).toBe(three);
	});
});
