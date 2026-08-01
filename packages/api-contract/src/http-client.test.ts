import { describe, expect, test } from "bun:test";
import { createHttpQuesterClient } from "./http-client.js";

describe("createHttpQuesterClient", () => {
	test("pickWorkspaceFolder returns null", async () => {
		const client = createHttpQuesterClient({
			baseUrl: "http://127.0.0.1:9",
			fetch: async () => new Response("{}", { status: 200 }),
		});
		expect(await client.pickWorkspaceFolder()).toBeNull();
	});

	test("getDefaultWorkspace calls /v1/workspace/default", async () => {
		const urls: string[] = [];
		const client = createHttpQuesterClient({
			baseUrl: "http://example.test",
			fetch: async (input) => {
				urls.push(String(input));
				return Response.json({ path: "/ws" });
			},
		});
		expect(await client.getDefaultWorkspace()).toBe("/ws");
		expect(urls[0]).toContain("/v1/workspace/default");
	});

	test("wraps Failed to fetch with API hint", async () => {
		const client = createHttpQuesterClient({
			baseUrl: "http://127.0.0.1:8787",
			fetch: async () => {
				throw new TypeError("Failed to fetch");
			},
		});
		await expect(client.getDefaultWorkspace()).rejects.toThrow(
			/Cannot reach API at http:\/\/127\.0\.0\.1:8787/,
		);
	});
});
