import { describe, expect, mock, test } from "bun:test";
import type { FlowV1 } from "@quester/schema";
import { executeFlow } from "./execute.js";

const httpFlow: FlowV1 = {
	id: "test",
	version: "v1",
	nodes: [
		{ id: "in", type: "input", data: {} },
		{
			id: "http",
			type: "http",
			data: { method: "GET", url: "https://example.com/api", headers: {} },
		},
		{ id: "out", type: "output", data: {} },
	],
	edges: [
		{ id: "e1", source: "in", target: "http" },
		{ id: "e2", source: "http", target: "out" },
	],
};

describe("executeFlow", () => {
	test("runs http node with mock fetch", async () => {
		const fetchMock = mock(
			async () =>
				new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
		);
		const result = await executeFlow(httpFlow, {
			input: { user: "x" },
			fetch: fetchMock as unknown as typeof fetch,
		});
		expect(fetchMock).toHaveBeenCalled();
		expect(result.output).toEqual({
			status: 200,
			body: { ok: true },
			text: '{"ok":true}',
			headers: expect.any(Object),
		});
	});

	test("follows if branch and merges set vars", async () => {
		const flow: FlowV1 = {
			id: "branch",
			version: "v1",
			nodes: [
				{ id: "in", type: "input", data: {} },
				{ id: "check", type: "if", data: { condition: "{{input.active}}" } },
				{ id: "setYes", type: "set", data: { variables: { path: "yes" } } },
				{ id: "setNo", type: "set", data: { variables: { path: "no" } } },
				{ id: "out", type: "output", data: {} },
			],
			edges: [
				{ id: "e1", source: "in", target: "check" },
				{ id: "e2", source: "check", target: "setYes", sourceHandle: "true" },
				{ id: "e3", source: "check", target: "setNo", sourceHandle: "false" },
				{ id: "e4", source: "setYes", target: "out" },
				{ id: "e5", source: "setNo", target: "out" },
			],
		};

		const active = await executeFlow(flow, {
			input: { active: "true" },
			fetch: mock(async () => new Response("{}")) as unknown as typeof fetch,
		});
		expect(active.vars.path).toBe("yes");

		const inactive = await executeFlow(flow, {
			input: { active: "" },
			fetch: mock(async () => new Response("{}")) as unknown as typeof fetch,
		});
		expect(inactive.vars.path).toBe("no");
	});
});
