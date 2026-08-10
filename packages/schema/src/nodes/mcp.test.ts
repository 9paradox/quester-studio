import { describe, expect, test } from "bun:test";
import { mcpNodeDataSchema } from "./mcp.js";

describe("mcpNodeDataSchema", () => {
	test("accepts server + tool", () => {
		const r = mcpNodeDataSchema.safeParse({
			server: "local-tools",
			tool: "echo",
			arguments: { text: "{{input.msg}}" },
		});
		expect(r.success).toBe(true);
	});

	test("rejects empty server", () => {
		const r = mcpNodeDataSchema.safeParse({ server: "", tool: "x" });
		expect(r.success).toBe(false);
	});
});
