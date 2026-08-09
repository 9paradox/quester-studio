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

	test("nested try inside foreach — success path", async () => {
		const flow: FlowV1 = {
			id: "nest-try-ok",
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
					id: "guard",
					type: "try",
					parentId: "loop",
					extent: "parent",
					data: {},
				},
				{
					id: "body",
					type: "template",
					parentId: "guard",
					extent: "parent",
					data: { template: "{{item}}-ok", mode: "safe" },
				},
				{ id: "out", type: "output", data: {} },
			],
			edges: [
				{ id: "e0", source: "start", target: "in" },
				{ id: "e0b", source: "in", target: "loop" },
				{
					id: "e1",
					source: "loop",
					target: "guard",
					sourceHandle: "entry",
				},
				{
					id: "e2",
					source: "guard",
					target: "loop",
					targetHandle: "exit",
				},
				{
					id: "e3",
					source: "guard",
					target: "body",
					sourceHandle: "entry",
				},
				{
					id: "e4",
					source: "body",
					target: "guard",
					targetHandle: "exit",
				},
				{
					id: "e5",
					source: "loop",
					target: "out",
					sourceHandle: "complete",
				},
			],
		};
		const result = await executeFlow(flow, { input: { ids: ["a", "b"] } });
		expect(result.output).toEqual({
			results: ["a-ok", "b-ok"],
			count: 2,
			truncated: false,
		});
	});

	test("nested try inside foreach — failed path does not rethrow", async () => {
		// Inner try returns failed payload; outer foreach still completes via body exit.
		const flow: FlowV1 = {
			id: "nest-try-fail",
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
					id: "guard",
					type: "try",
					parentId: "loop",
					extent: "parent",
					data: {},
				},
				{
					id: "body",
					type: "assert",
					parentId: "guard",
					extent: "parent",
					data: { checks: [{ path: "ok", op: "eq", value: true }] },
				},
				{ id: "out", type: "output", data: {} },
			],
			edges: [
				{ id: "e0", source: "start", target: "in" },
				{ id: "e0b", source: "in", target: "loop" },
				{
					id: "e1",
					source: "loop",
					target: "guard",
					sourceHandle: "entry",
				},
				{
					id: "e2",
					source: "guard",
					target: "loop",
					targetHandle: "exit",
				},
				{
					id: "e3",
					source: "guard",
					target: "body",
					sourceHandle: "entry",
				},
				{
					id: "e4",
					source: "body",
					target: "guard",
					targetHandle: "exit",
				},
				{
					id: "e5",
					source: "loop",
					target: "out",
					sourceHandle: "complete",
				},
			],
		};
		const result = await executeFlow(flow, {
			input: { ids: [{ ok: false }, { ok: false }] },
		});
		expect(result.output).toMatchObject({
			count: 2,
			truncated: false,
		});
		const results = (result.output as { results: unknown[] }).results;
		expect(results).toHaveLength(2);
		for (const row of results) {
			expect(row).toMatchObject({ failed: true });
		}
	});

	test("foreach nested inside try", async () => {
		const flow: FlowV1 = {
			id: "nest-fe-in-try",
			version: "v1",
			nodes: [
				{ id: "start", type: "start", data: {} },
				{ id: "in", type: "input", data: {} },
				{ id: "guard", type: "try", data: {} },
				{
					id: "loop",
					type: "foreach",
					parentId: "guard",
					extent: "parent",
					data: { items: "ids", maxItems: 100 },
				},
				{
					id: "row",
					type: "template",
					parentId: "loop",
					extent: "parent",
					data: { template: "{{item}}", mode: "safe" },
				},
				{ id: "ok", type: "set", data: { variables: { branch: "success" } } },
				{ id: "out", type: "output", data: {} },
			],
			edges: [
				{ id: "e0", source: "start", target: "in" },
				{ id: "e0b", source: "in", target: "guard" },
				{
					id: "e1",
					source: "guard",
					target: "loop",
					sourceHandle: "entry",
				},
				{
					id: "e2",
					source: "loop",
					target: "guard",
					targetHandle: "exit",
				},
				{
					id: "e3",
					source: "loop",
					target: "row",
					sourceHandle: "entry",
				},
				{
					id: "e4",
					source: "row",
					target: "loop",
					targetHandle: "exit",
				},
				{
					id: "e5",
					source: "guard",
					target: "ok",
					sourceHandle: "success",
				},
				{ id: "e6", source: "ok", target: "out" },
			],
		};
		const result = await executeFlow(flow, { input: { ids: [10, 20] } });
		expect(result.vars.branch).toBe("success");
		expect(result.nodeOutputs.loop).toEqual({
			results: [10, 20],
			count: 2,
			truncated: false,
		});
	});

	test("depth ≥ 2 nested frames (foreach → try → body)", async () => {
		const flow: FlowV1 = {
			id: "nest-depth2",
			version: "v1",
			nodes: [
				{ id: "start", type: "start", data: {} },
				{ id: "in", type: "input", data: {} },
				{
					id: "outer",
					type: "foreach",
					data: { items: "ids", maxItems: 100 },
				},
				{
					id: "mid",
					type: "try",
					parentId: "outer",
					extent: "parent",
					data: {},
				},
				{
					id: "leaf",
					type: "template",
					parentId: "mid",
					extent: "parent",
					data: { template: "d2-{{item}}", mode: "safe" },
				},
				{ id: "out", type: "output", data: {} },
			],
			edges: [
				{ id: "e0", source: "start", target: "in" },
				{ id: "e0b", source: "in", target: "outer" },
				{
					id: "e1",
					source: "outer",
					target: "mid",
					sourceHandle: "entry",
				},
				{
					id: "e2",
					source: "mid",
					target: "outer",
					targetHandle: "exit",
				},
				{
					id: "e3",
					source: "mid",
					target: "leaf",
					sourceHandle: "entry",
				},
				{
					id: "e4",
					source: "leaf",
					target: "mid",
					targetHandle: "exit",
				},
				{
					id: "e5",
					source: "outer",
					target: "out",
					sourceHandle: "complete",
				},
			],
		};
		const result = await executeFlow(flow, { input: { ids: ["a", "b"] } });
		expect(result.output).toEqual({
			results: ["d2-a", "d2-b"],
			count: 2,
			truncated: false,
		});
	});

	test("foreach concurrency with nested try", async () => {
		const flow: FlowV1 = {
			id: "nest-conc",
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
					id: "guard",
					type: "try",
					parentId: "loop",
					extent: "parent",
					data: {},
				},
				{
					id: "body",
					type: "template",
					parentId: "guard",
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
					target: "guard",
					sourceHandle: "entry",
				},
				{
					id: "e2",
					source: "guard",
					target: "loop",
					targetHandle: "exit",
				},
				{
					id: "e3",
					source: "guard",
					target: "body",
					sourceHandle: "entry",
				},
				{
					id: "e4",
					source: "body",
					target: "guard",
					targetHandle: "exit",
				},
				{
					id: "e5",
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
