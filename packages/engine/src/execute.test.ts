import { describe, expect, mock, test } from "bun:test";
import type { FlowV1 } from "@quester-studio/schema";
import { EngineEventEmitter } from "./events.js";
import {
	FlowCancelledError,
	FlowExecutionError,
	executeFlow,
} from "./execute.js";

const httpFlow: FlowV1 = {
	id: "test",
	version: "v1",
	nodes: [
		{ id: "start", type: "start", data: {} },
		{ id: "in", type: "input", data: {} },
		{
			id: "http",
			type: "http",
			data: { method: "GET", url: "https://example.com/api", headers: {} },
		},
		{ id: "out", type: "output", data: {} },
	],
	edges: [
		{ id: "e0", source: "start", target: "in" },
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
			statusText: expect.any(String),
			body: { ok: true },
			text: '{"ok":true}',
			headers: expect.any(Object),
			request: {
				method: "GET",
				url: "https://example.com/api",
				headers: {},
			},
			timing: {
				startedAt: expect.any(Number),
				endedAt: expect.any(Number),
				durationMs: expect.any(Number),
			},
			size: expect.any(Number),
		});
		expect(result.nodeInputs.start).toEqual({});
		expect(result.nodeInputs.in).toEqual({ user: "x" });
		expect(result.nodeInputs.http).toEqual({ user: "x" });
		expect(result.steps.map((s) => s.nodeId)).toEqual([
			"start",
			"in",
			"http",
			"out",
		]);
		expect(result.steps[2]?.input).toEqual({ user: "x" });
		expect(result.steps[2]?.output).toMatchObject({
			status: 200,
			body: { ok: true },
		});
	});

	test("throws FlowExecutionError with partial steps on node failure", async () => {
		const fetchMock = mock(async () => {
			throw new Error("unable to verify the first certificate");
		});
		try {
			await executeFlow(httpFlow, {
				input: { user: "x" },
				fetch: fetchMock as unknown as typeof fetch,
			});
			expect.unreachable("should throw");
		} catch (err) {
			expect(err).toBeInstanceOf(FlowExecutionError);
			const failure = err as FlowExecutionError;
			expect(failure.message).toContain(
				"unable to verify the first certificate",
			);
			expect(failure.failedNodeId).toBe("http");
			expect(failure.partial.steps.map((s) => s.nodeId)).toEqual([
				"start",
				"in",
				"http",
			]);
			expect(failure.partial.nodeInputs.http).toEqual({ user: "x" });
			expect(failure.partial.steps[2]?.error).toContain("certificate");
		}
	});

	test("follows if branch and merges set vars", async () => {
		const flow: FlowV1 = {
			id: "branch",
			version: "v1",
			nodes: [
				{ id: "start", type: "start", data: {} },
				{ id: "in", type: "input", data: {} },
				{ id: "check", type: "if", data: { condition: "{{input.active}}" } },
				{ id: "setYes", type: "set", data: { variables: { path: "yes" } } },
				{ id: "setNo", type: "set", data: { variables: { path: "no" } } },
				{ id: "out", type: "output", data: {} },
			],
			edges: [
				{ id: "e0", source: "start", target: "in" },
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

	test("waits for both diamond arms before join", async () => {
		const flow: FlowV1 = {
			id: "diamond",
			version: "v1",
			nodes: [
				{ id: "start", type: "start", data: {} },
				{ id: "a", type: "set", data: { variables: { fan: "out" } } },
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
		};

		const result = await executeFlow(flow, {
			fetch: mock(async () => new Response("{}")) as unknown as typeof fetch,
		});
		const order = result.steps.map((s) => s.nodeId);
		expect(order.indexOf("b")).toBeLessThan(order.indexOf("j"));
		expect(order.indexOf("c")).toBeLessThan(order.indexOf("j"));
		expect(result.nodeOutputs.b).toBe("from-b");
		expect(result.nodeOutputs.c).toBe("from-c");
		expect(result.nodeOutputs.j).toEqual({ b: "from-b", c: "from-c" });
		expect(result.output).toEqual({ b: "from-b", c: "from-c" });
	});

	test("aborts between nodes when signal is cancelled", async () => {
		const flow: FlowV1 = {
			id: "abort",
			version: "v1",
			nodes: [
				{ id: "start", type: "start", data: {} },
				{ id: "a", type: "set", data: { variables: { step: "a" } } },
				{ id: "b", type: "set", data: { variables: { step: "b" } } },
				{ id: "out", type: "output", data: {} },
			],
			edges: [
				{ id: "e0", source: "start", target: "a" },
				{ id: "e1", source: "a", target: "b" },
				{ id: "e2", source: "b", target: "out" },
			],
		};
		const controller = new AbortController();
		const events = new EngineEventEmitter();
		events.on("node:after", ({ nodeId }) => {
			if (nodeId === "a") controller.abort();
		});
		try {
			await executeFlow(flow, {
				events,
				signal: controller.signal,
				fetch: mock(async () => new Response("{}")) as unknown as typeof fetch,
			});
			expect.unreachable("should throw");
		} catch (err) {
			expect(err).toBeInstanceOf(FlowCancelledError);
			const cancelled = err as FlowCancelledError;
			expect(cancelled.partial.steps.map((s) => s.nodeId)).toEqual([
				"start",
				"a",
			]);
			expect(cancelled.partial.vars.step).toBe("a");
		}
	});

	test("aborts in-flight HTTP when signal is cancelled", async () => {
		const controller = new AbortController();
		const fetchMock = mock(async (_url, init?) => {
			await new Promise<void>((_resolve, reject) => {
				init?.signal?.addEventListener(
					"abort",
					() => {
						reject(
							new DOMException("The operation was aborted.", "AbortError"),
						);
					},
					{ once: true },
				);
				setTimeout(() => controller.abort(), 10);
			});
			return new Response("{}");
		});
		try {
			await executeFlow(httpFlow, {
				signal: controller.signal,
				fetch: fetchMock as unknown as typeof fetch,
			});
			expect.unreachable("should throw");
		} catch (err) {
			expect(err).toBeInstanceOf(FlowCancelledError);
			const cancelled = err as FlowCancelledError;
			expect(cancelled.partial.steps.map((s) => s.nodeId)).toEqual([
				"start",
				"in",
			]);
		}
	});

	test("assert failure retains structured check output on the step", async () => {
		const flow: FlowV1 = {
			id: "assert-fail",
			version: "v1",
			nodes: [
				{ id: "start", type: "start", data: {} },
				{ id: "in", type: "input", data: {} },
				{
					id: "check",
					type: "assert",
					data: {
						checks: [{ path: "status", equals: 200 }, { path: "ok" }],
					},
				},
			],
			edges: [
				{ id: "e0", source: "start", target: "in" },
				{ id: "e1", source: "in", target: "check" },
			],
		};
		try {
			await executeFlow(flow, { input: { status: 500, ok: true } });
			expect.unreachable("should throw");
		} catch (err) {
			expect(err).toBeInstanceOf(FlowExecutionError);
			const failure = err as FlowExecutionError;
			expect(failure.failedNodeId).toBe("check");
			const step = failure.partial.steps.find((s) => s.nodeId === "check");
			expect(step?.error).toMatch(/Assertion failed/);
			expect(step?.output).toMatchObject({
				ok: false,
				checks: [
					{ path: "status", ok: false },
					{ path: "ok", ok: true },
				],
			});
		}
	});
});
