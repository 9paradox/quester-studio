import { describe, expect, mock, test } from "bun:test";
import type { FlowV1 } from "@quester-studio/schema";
import "@quester-studio/nodes";
import { SUBFLOW_MAX_DEPTH, createExecuteSubflow } from "./subflow.js";

const childFlow: FlowV1 = {
	id: "child",
	version: "v1",
	nodes: [
		{ id: "start", type: "start", data: {} },
		{ id: "in", type: "input", data: {} },
		{ id: "out", type: "output", data: {} },
	],
	edges: [
		{ id: "e0", source: "start", target: "in" },
		{ id: "e1", source: "in", target: "out" },
	],
};

const parentFlow: FlowV1 = {
	id: "parent",
	version: "v1",
	nodes: [
		{ id: "start", type: "start", data: {} },
		{
			id: "call",
			type: "subflow",
			data: { flowId: "child", input: { echo: "{{input.msg}}" } },
		},
		{ id: "out", type: "output", data: {} },
	],
	edges: [
		{ id: "e0", source: "start", target: "call" },
		{ id: "e1", source: "call", target: "out" },
	],
};

describe("createExecuteSubflow", () => {
	test("runs nested flow and returns output", async () => {
		const flows = { parent: parentFlow, child: childFlow };
		const executeSubflow = createExecuteSubflow(
			{ getFlow: (id) => flows[id as keyof typeof flows] },
			{
				env: {},
				fetch: mock(async () => new Response("{}")) as unknown as typeof fetch,
			},
			"parent",
		);
		const output = await executeSubflow("child", { msg: "hi" });
		expect(output).toEqual({ msg: "hi" });
	});

	test("detects cycles", async () => {
		const cycleA: FlowV1 = {
			id: "a",
			version: "v1",
			nodes: [
				{ id: "start", type: "start", data: {} },
				{ id: "call", type: "subflow", data: { flowId: "b" } },
			],
			edges: [{ id: "e0", source: "start", target: "call" }],
		};
		const cycleB: FlowV1 = {
			id: "b",
			version: "v1",
			nodes: [
				{ id: "start", type: "start", data: {} },
				{ id: "call", type: "subflow", data: { flowId: "a" } },
			],
			edges: [{ id: "e0", source: "start", target: "call" }],
		};
		const executeSubflow = createExecuteSubflow(
			{ getFlow: (id) => (id === "a" ? cycleA : cycleB) },
			{ env: {}, fetch: fetch },
			"a",
		);
		await expect(executeSubflow("b", {})).rejects.toThrow("cycle detected");
	});

	test("enforces max depth", async () => {
		const chain = Array.from({ length: SUBFLOW_MAX_DEPTH + 1 }, (_, i) => {
			const id = `f${i}`;
			const next =
				i < SUBFLOW_MAX_DEPTH ? `f${i + 1}` : `f${SUBFLOW_MAX_DEPTH}`;
			return {
				id,
				flow: {
					id,
					version: "v1" as const,
					nodes: [
						{ id: "start", type: "start", data: {} },
						{ id: "call", type: "subflow", data: { flowId: next } },
					],
					edges: [{ id: "e0", source: "start", target: "call" }],
				},
			};
		});
		const byId = Object.fromEntries(chain.map(({ id, flow }) => [id, flow]));
		const executeSubflow = createExecuteSubflow(
			{ getFlow: (id) => byId[id] },
			{ env: {}, fetch: fetch },
			"f0",
		);
		await expect(executeSubflow("f1", {})).rejects.toThrow("max depth");
	});

	test("shares cookieJar with nested executeFlow", async () => {
		const { CookieJar } = await import("@quester-studio/nodes");
		const jar = new CookieJar();
		jar.storeFromSetCookie("https://api.example.com/", [
			"session=from-parent; Path=/",
		]);

		const childWithHttp: FlowV1 = {
			id: "child-http",
			version: "v1",
			nodes: [
				{ id: "start", type: "start", data: {} },
				{ id: "in", type: "input", data: {} },
				{
					id: "http",
					type: "http",
					data: { method: "GET", url: "https://api.example.com/me" },
				},
				{ id: "out", type: "output", data: {} },
			],
			edges: [
				{ id: "e0", source: "start", target: "in" },
				{ id: "e1", source: "in", target: "http" },
				{ id: "e2", source: "http", target: "out" },
			],
		};

		let seenCookie: string | undefined;
		const fetchMock = mock(
			async (_url: RequestInfo | URL, init?: RequestInit) => {
				const headers = init?.headers as Record<string, string>;
				seenCookie = headers?.Cookie;
				return new Response("{}", { status: 200 });
			},
		) as unknown as typeof fetch;

		const executeSubflow = createExecuteSubflow(
			{ getFlow: (id) => (id === "child-http" ? childWithHttp : undefined) },
			{
				env: {},
				fetch: fetchMock,
				cookieJar: jar,
			},
			"parent",
		);
		await executeSubflow("child-http", {});
		expect(seenCookie).toBe("session=from-parent");
	});
});
