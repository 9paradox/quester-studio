import { describe, expect, test } from "bun:test";
import type { NodeExecutionContext } from "../types.js";
import { extractPlugin } from "./extract.js";
import { httpPlugin } from "./http.js";
import { ifPlugin } from "./if.js";
import { inputPlugin } from "./input.js";
import { setPlugin } from "./set.js";
import { templatePlugin } from "./template.js";
import { assertHttpUrl } from "./validate-http-url.js";

function ctx(
	overrides: Partial<NodeExecutionContext> = {},
): NodeExecutionContext {
	const vars: Record<string, unknown> = {};
	const nodeOutputs: Record<string, unknown> = {};
	return {
		node: { id: "n1", type: "test", data: {} },
		input: { body: { id: 7, name: "test" } },
		flowInput: { username: "alice" },
		vars,
		nodeOutputs,
		resolveTemplate: (t) =>
			t
				.replace("{{input.username}}", "alice")
				.replace("{{vars.greeting}}", "hi"),
		fetch: fetch,
		...overrides,
	};
}

describe("builtin node plugins", () => {
	test("input passes flow input through", async () => {
		const result = await inputPlugin.execute(ctx());
		expect(result.output).toEqual({ username: "alice" });
	});

	test("extract reads jmespath from previous output", async () => {
		const result = await extractPlugin.execute(
			ctx({
				node: {
					id: "ex",
					type: "extract",
					data: { expression: "body.id", source: "previous" },
				},
			}),
		);
		expect(result.output).toBe(7);
	});

	test("set merges resolved variables", async () => {
		const result = await setPlugin.execute(
			ctx({
				vars: { existing: 1 },
				node: {
					id: "set",
					type: "set",
					data: {
						variables: { greeting: "Hello {{input.username}}", count: 3 },
					},
				},
			}),
		);
		expect(result.vars).toEqual({
			existing: 1,
			greeting: "Hello alice",
			count: 3,
		});
	});

	test("if evaluates condition and sets branch", async () => {
		const trueResult = await ifPlugin.execute(
			ctx({
				node: {
					id: "if",
					type: "if",
					data: { condition: "{{input.username}}" },
				},
			}),
		);
		expect(trueResult.branch).toBe("true");

		const falseResult = await ifPlugin.execute(
			ctx({
				node: { id: "if", type: "if", data: { condition: "false" } },
				resolveTemplate: () => "false",
			}),
		);
		expect(falseResult.branch).toBe("false");
	});

	test("template renders with eta context", async () => {
		const result = await templatePlugin.execute(
			ctx({
				node: {
					id: "tpl",
					type: "template",
					data: { template: "Hello <%= it.input.username %>" },
				},
			}),
		);
		expect(result.output).toBe("Hello alice");
	});

	test("assertHttpUrl accepts http and https", () => {
		expect(() => assertHttpUrl("https://api.example.com/v1")).not.toThrow();
		expect(() => assertHttpUrl("http://localhost:3000")).not.toThrow();
	});

	test("assertHttpUrl rejects non-http schemes", () => {
		expect(() => assertHttpUrl("file:///etc/passwd")).toThrow(/http or https/);
		expect(() => assertHttpUrl("ftp://example.com")).toThrow(/http or https/);
	});

	test("http plugin rejects file URLs at execute time", async () => {
		await expect(
			httpPlugin.execute(
				ctx({
					node: {
						id: "http",
						type: "http",
						data: { method: "GET", url: "file:///secret" },
					},
				}),
			),
		).rejects.toThrow(/http or https/);
	});

	test("http plugin returns request snapshot and timing", async () => {
		const result = await httpPlugin.execute(
			ctx({
				node: {
					id: "http",
					type: "http",
					data: {
						method: "POST",
						url: "https://example.com/login",
						headers: { "Content-Type": "application/json" },
						body: '{"u":"{{input.username}}"}',
					},
				},
				fetch: (async () =>
					new Response('{"ok":true}', {
						status: 201,
						statusText: "Created",
						headers: { "content-type": "application/json" },
					})) as typeof fetch,
			}),
		);
		const output = result.output as {
			status: number;
			request: { method: string; url: string; body?: string };
			timing: { durationMs: number };
			size: number;
			body: unknown;
		};
		expect(output.status).toBe(201);
		expect(output.request).toEqual({
			method: "POST",
			url: "https://example.com/login",
			headers: { "Content-Type": "application/json" },
			body: '{"u":"alice"}',
		});
		expect(output.timing.durationMs).toBeGreaterThanOrEqual(0);
		expect(output.size).toBeGreaterThan(0);
		expect(output.body).toEqual({ ok: true });
	});
});
