import { describe, expect, test } from "bun:test";
import type { NodeExecutionContext } from "../types.js";
import { apiKeyPlugin } from "./apiKey.js";
import { basicAuthPlugin } from "./basicAuth.js";
import { bearerPlugin } from "./bearer.js";
import {
	HTTP_AUTH_HEADERS_VAR,
	HTTP_AUTH_QUERY_VAR,
} from "./http-auth-vars.js";
import { httpPlugin } from "./http.js";

function ctx(
	overrides: Partial<NodeExecutionContext> = {},
): NodeExecutionContext {
	return {
		node: { id: "n1", type: "test", data: {} },
		input: { from: "prev" },
		flowInput: {},
		vars: {},
		nodeOutputs: {},
		resolveTemplate: (t) =>
			t
				.replace("{{secrets.TOKEN}}", "tok-secret")
				.replace("{{input.username}}", "alice")
				.replace("{{input.password}}", "s3cret"),
		fetch: fetch,
		...overrides,
	};
}

describe("auth helper plugins", () => {
	test("bearer sets Authorization and does not echo token", async () => {
		const result = await bearerPlugin.execute(
			ctx({
				node: {
					id: "b",
					type: "bearer",
					data: { token: "{{secrets.TOKEN}}" },
				},
			}),
		);
		expect(result.output).toEqual({ from: "prev" });
		expect(result.vars?.[HTTP_AUTH_HEADERS_VAR]).toEqual({
			Authorization: "Bearer tok-secret",
		});
		expect(JSON.stringify(result.processedInput)).not.toContain("tok-secret");
		expect(JSON.stringify(result.output)).not.toContain("tok-secret");
	});

	test("bearer rejects empty token", async () => {
		await expect(
			bearerPlugin.execute(
				ctx({
					resolveTemplate: () => "  ",
					node: { id: "b", type: "bearer", data: { token: "{{x}}" } },
				}),
			),
		).rejects.toThrow(/empty/);
	});

	test("basicAuth encodes header and omits password from output", async () => {
		const result = await basicAuthPlugin.execute(
			ctx({
				node: {
					id: "ba",
					type: "basicAuth",
					data: {
						username: "{{input.username}}",
						password: "{{input.password}}",
					},
				},
			}),
		);
		const expected = Buffer.from("alice:s3cret", "utf8").toString("base64");
		expect(result.vars?.[HTTP_AUTH_HEADERS_VAR]).toEqual({
			Authorization: `Basic ${expected}`,
		});
		expect(JSON.stringify(result.output)).not.toContain("s3cret");
		expect(JSON.stringify(result.processedInput)).not.toContain("s3cret");
		expect(JSON.stringify(result.processedInput)).not.toContain("alice");
	});

	test("apiKey header and query merge without dropping prior headers", async () => {
		const header = await apiKeyPlugin.execute(
			ctx({
				vars: {
					[HTTP_AUTH_HEADERS_VAR]: { Authorization: "Bearer x" },
				},
				node: {
					id: "k",
					type: "apiKey",
					data: { name: "X-Api-Key", value: "k1", in: "header" },
				},
			}),
		);
		expect(header.vars?.[HTTP_AUTH_HEADERS_VAR]).toEqual({
			Authorization: "Bearer x",
			"X-Api-Key": "k1",
		});

		const query = await apiKeyPlugin.execute(
			ctx({
				node: {
					id: "k",
					type: "apiKey",
					data: { name: "apiKey", value: "q1", in: "query" },
				},
			}),
		);
		expect(query.vars?.[HTTP_AUTH_QUERY_VAR]).toEqual({ apiKey: "q1" });
		expect(JSON.stringify(query.processedInput)).not.toContain("q1");
	});
});

describe("http applies auth vars", () => {
	test("applies bearer header; node headers win case-insensitively", async () => {
		let seen: Record<string, string> | undefined;
		await httpPlugin.execute(
			ctx({
				vars: {
					[HTTP_AUTH_HEADERS_VAR]: { Authorization: "Bearer from-auth" },
				},
				node: {
					id: "http",
					type: "http",
					data: {
						method: "GET",
						url: "https://example.com/me",
						headers: { authorization: "Bearer from-node" },
					},
				},
				fetch: (async (_url, init) => {
					seen = init?.headers as Record<string, string>;
					return new Response("{}", { status: 200 });
				}) as typeof fetch,
			}),
		);
		expect(seen?.authorization).toBe("Bearer from-node");
		expect(seen?.Authorization).toBeUndefined();
	});

	test("applies apiKey query; existing URL query keys win", async () => {
		let seenUrl = "";
		await httpPlugin.execute(
			ctx({
				vars: {
					[HTTP_AUTH_QUERY_VAR]: { apiKey: "from-auth", extra: "1" },
				},
				node: {
					id: "http",
					type: "http",
					data: {
						method: "GET",
						url: "https://example.com/items?apiKey=from-url",
						headers: {},
					},
				},
				fetch: (async (url) => {
					seenUrl = String(url);
					return new Response("{}", { status: 200 });
				}) as typeof fetch,
			}),
		);
		const parsed = new URL(seenUrl);
		expect(parsed.searchParams.get("apiKey")).toBe("from-url");
		expect(parsed.searchParams.get("extra")).toBe("1");
	});

	test("does not merge previous-node response headers from input", async () => {
		let seen: Record<string, string> | undefined;
		await httpPlugin.execute(
			ctx({
				input: {
					status: 200,
					headers: { Authorization: "Bearer leaked", "X-From-Response": "yes" },
					body: {},
				},
				node: {
					id: "http",
					type: "http",
					data: {
						method: "GET",
						url: "https://example.com",
						headers: {},
					},
				},
				fetch: (async (_url, init) => {
					seen = init?.headers as Record<string, string>;
					return new Response("{}", { status: 200 });
				}) as typeof fetch,
			}),
		);
		expect(seen?.Authorization).toBeUndefined();
		expect(seen?.["X-From-Response"]).toBeUndefined();
	});

	test("skipInheritedAuth omits auth headers and query", async () => {
		let seenUrl = "";
		let seen: Record<string, string> | undefined;
		await httpPlugin.execute(
			ctx({
				vars: {
					[HTTP_AUTH_HEADERS_VAR]: { Authorization: "Bearer from-auth" },
					[HTTP_AUTH_QUERY_VAR]: { apiKey: "from-auth" },
				},
				httpDefaults: {
					defaultHeaders: { "X-Default": "yes" },
				},
				node: {
					id: "http",
					type: "http",
					data: {
						method: "GET",
						url: "https://example.com/products",
						headers: { Accept: "application/json" },
						skipInheritedAuth: true,
					},
				},
				fetch: (async (url, init) => {
					seenUrl = String(url);
					seen = init?.headers as Record<string, string>;
					return new Response("{}", { status: 200 });
				}) as typeof fetch,
			}),
		);
		expect(seen?.Authorization).toBeUndefined();
		expect(seen?.Accept).toBe("application/json");
		expect(seen?.["X-Default"]).toBe("yes");
		expect(new URL(seenUrl).searchParams.get("apiKey")).toBeNull();
	});
});
