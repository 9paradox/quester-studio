import { describe, expect, test } from "bun:test";
import type { FlowV1 } from "@quester-studio/schema";
import { executeFlow } from "./execute.js";

describe("framed try / foreach", () => {
	test("try success runs body and takes success handle", async () => {
		const flow: FlowV1 = {
			id: "try-ok",
			version: "v1",
			nodes: [
				{ id: "start", type: "start", data: {} },
				{ id: "guard", type: "try", data: { label: "guard" } },
				{
					id: "body",
					type: "set",
					parentId: "guard",
					extent: "parent",
					data: { variables: { path: "ok" } },
				},
				{ id: "ok", type: "set", data: { variables: { branch: "success" } } },
				{ id: "fail", type: "set", data: { variables: { branch: "failed" } } },
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
					target: "ok",
					sourceHandle: "success",
				},
				{
					id: "e4",
					source: "guard",
					target: "fail",
					sourceHandle: "failed",
				},
				{ id: "e5", source: "ok", target: "out" },
			],
		};
		const result = await executeFlow(flow);
		expect(result.vars.path).toBe("ok");
		expect(result.vars.branch).toBe("success");
		expect(result.steps.some((s) => s.nodeId === "body")).toBe(true);
	});

	test("try catches assert throw and takes failed handle", async () => {
		const flow: FlowV1 = {
			id: "try-fail",
			version: "v1",
			nodes: [
				{ id: "start", type: "start", data: {} },
				{ id: "in", type: "input", data: {} },
				{ id: "guard", type: "try", data: {} },
				{
					id: "body",
					type: "assert",
					parentId: "guard",
					extent: "parent",
					data: { checks: [{ path: "status", op: "eq", value: 200 }] },
				},
				{ id: "ok", type: "set", data: { variables: { branch: "success" } } },
				{ id: "fail", type: "set", data: { variables: { branch: "failed" } } },
				{ id: "out", type: "output", data: {} },
			],
			edges: [
				{ id: "e0", source: "start", target: "in" },
				{ id: "e0b", source: "in", target: "guard" },
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
					target: "ok",
					sourceHandle: "success",
				},
				{
					id: "e4",
					source: "guard",
					target: "fail",
					sourceHandle: "failed",
				},
				{ id: "e5", source: "fail", target: "out" },
			],
		};
		const result = await executeFlow(flow, { input: { status: 500 } });
		expect(result.vars.branch).toBe("failed");
		expect(result.nodeOutputs.guard).toMatchObject({
			failed: true,
			input: { status: 500 },
		});
	});

	test("foreach runs body per item and collects results", async () => {
		const flow: FlowV1 = {
			id: "fe",
			version: "v1",
			nodes: [
				{ id: "start", type: "start", data: {} },
				{ id: "in", type: "input", data: {} },
				{
					id: "loop",
					type: "foreach",
					data: { items: "ids", maxItems: 100 },
				},
				{
					id: "row",
					type: "template",
					parentId: "loop",
					extent: "parent",
					data: { template: "{{item}}-{{index}}", mode: "safe" },
				},
				{ id: "out", type: "output", data: {} },
			],
			edges: [
				{ id: "e0", source: "start", target: "in" },
				{ id: "e0b", source: "in", target: "loop" },
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
					target: "out",
					sourceHandle: "complete",
				},
			],
		};
		const result = await executeFlow(flow, { input: { ids: ["a", "b", "c"] } });
		expect(result.output).toEqual({
			results: ["a-0", "b-1", "c-2"],
			count: 3,
			truncated: false,
		});
	});

	test("foreach concurrency runs multiple body iterations", async () => {
		const flow: FlowV1 = {
			id: "fe-par",
			version: "v1",
			nodes: [
				{ id: "start", type: "start", data: {} },
				{ id: "in", type: "input", data: {} },
				{
					id: "loop",
					type: "foreach",
					data: { items: "ids", concurrency: 3, maxItems: 100 },
				},
				{
					id: "row",
					type: "template",
					parentId: "loop",
					extent: "parent",
					data: { template: "{{item}}", mode: "safe" },
				},
				{ id: "out", type: "output", data: {} },
			],
			edges: [
				{ id: "e0", source: "start", target: "in" },
				{ id: "e0b", source: "in", target: "loop" },
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
					target: "out",
					sourceHandle: "complete",
				},
			],
		};
		const result = await executeFlow(flow, { input: { ids: [1, 2, 3, 4] } });
		expect(result.output).toEqual({
			results: [1, 2, 3, 4],
			count: 4,
			truncated: false,
		});
	});
});
