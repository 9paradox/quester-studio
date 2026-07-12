import { describe, expect, test } from "bun:test";
import type { FlowV1 } from "@quester/schema";
import {
	deleteEdgesFromFlow,
	deleteNodesFromFlow,
	duplicateNodeInFlow,
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
});

describe("deleteEdgesFromFlow", () => {
	test("removes only the edge", () => {
		const next = deleteEdgesFromFlow(sampleFlow, ["e-1"]);
		expect(next.nodes).toHaveLength(2);
		expect(next.edges).toEqual([]);
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
});
