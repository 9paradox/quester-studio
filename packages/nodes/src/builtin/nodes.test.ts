import { describe, expect, test } from "bun:test";
import type { NodeExecutionContext } from "../types.js";
import { extractPlugin } from "./extract.js";
import { httpPlugin } from "./http.js";
import { ifPlugin } from "./if.js";
import { inputPlugin } from "./input.js";
import { setPlugin } from "./set.js";
import { startPlugin } from "./start.js";
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
	test("start emits empty object", async () => {
		const result = await startPlugin.execute(ctx());
		expect(result.output).toEqual({});
	});

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
					data: { expression: "body.id" },
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

	test("if evaluates checks against previous output", async () => {
		const trueResult = await ifPlugin.execute(
			ctx({
				node: {
					id: "if",
					type: "if",
					data: {
						checks: [{ path: "status", op: "gte", value: 200 }],
					},
				},
				input: { status: 201 },
			}),
		);
		expect(trueResult.branch).toBe("true");

		const falseResult = await ifPlugin.execute(
			ctx({
				node: {
					id: "if",
					type: "if",
					data: {
						checks: [{ path: "status", op: "lt", value: 300 }],
					},
				},
				input: { status: 500 },
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

	test("http plugin merges defaultHeaders under node headers", async () => {
		const result = await httpPlugin.execute(
			ctx({
				node: {
					id: "http",
					type: "http",
					data: {
						method: "GET",
						url: "https://example.com",
						headers: { Accept: "text/plain", "X-Node": "1" },
					},
				},
				httpDefaults: {
					defaultHeaders: {
						Accept: "application/json",
						"X-Default": "yes",
					},
				},
				fetch: (async (_url, init) => {
					const h = init?.headers as Record<string, string>;
					expect(h.Accept).toBe("text/plain");
					expect(h["X-Default"]).toBe("yes");
					expect(h["X-Node"]).toBe("1");
					return new Response("{}", { status: 200 });
				}) as typeof fetch,
			}),
		);
		expect((result.output as { status: number }).status).toBe(200);
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

	test("http plugin enforces maxResponseBytes via Content-Length", async () => {
		await expect(
			httpPlugin.execute(
				ctx({
					node: {
						id: "http",
						type: "http",
						data: { method: "GET", url: "https://example.com" },
					},
					httpDefaults: { defaultHeaders: {}, maxResponseBytes: 4 },
					fetch: (async () =>
						new Response("hello world", {
							status: 200,
							headers: { "content-length": "11" },
						})) as typeof fetch,
				}),
			),
		).rejects.toThrow(/maxResponseBytes/);
	});

	test("http plugin applies cookie jar across responses", async () => {
		const { CookieJar } = await import("../cookie-jar.js");
		const jar = new CookieJar();
		let calls = 0;
		const fetchMock = (async (url: RequestInfo | URL, init?: RequestInit) => {
			calls += 1;
			if (calls === 1) {
				return new Response("{}", {
					status: 200,
					headers: { "set-cookie": "session=abc; Path=/" },
				});
			}
			const headers = init?.headers as Record<string, string>;
			expect(headers.Cookie).toBe("session=abc");
			return new Response("{}", { status: 200 });
		}) as typeof fetch;

		await httpPlugin.execute(
			ctx({
				node: {
					id: "http",
					type: "http",
					data: { method: "GET", url: "https://api.example.com/login" },
				},
				cookieJar: jar,
				fetch: fetchMock,
			}),
		);
		await httpPlugin.execute(
			ctx({
				node: {
					id: "http",
					type: "http",
					data: { method: "GET", url: "https://api.example.com/me" },
				},
				cookieJar: jar,
				fetch: fetchMock,
			}),
		);
		expect(calls).toBe(2);
	});
});
