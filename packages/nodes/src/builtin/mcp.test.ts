import { describe, expect, test } from "bun:test";
import { mcpPlugin } from "./mcp.js";

describe("mcpPlugin", () => {
	test("calls callMcpTool with resolved args", async () => {
		const result = await mcpPlugin.execute({
			node: {
				id: "m1",
				type: "mcp",
				data: {
					server: "svc",
					tool: "echo",
					arguments: { text: "hello-{{vars.x}}" },
				},
			},
			input: {},
			flowInput: {},
			vars: { x: "world" },
			nodeOutputs: {},
			resolveTemplate: (t) => t.replace("{{vars.x}}", "world"),
			fetch: globalThis.fetch,
			callMcpTool: async (req) => ({ ok: true, req }),
		});
		expect(result.output).toEqual({
			ok: true,
			req: {
				serverId: "svc",
				tool: "echo",
				arguments: { text: "hello-world" },
				timeoutMs: undefined,
				signal: undefined,
			},
		});
	});

	test("throws when callMcpTool missing", async () => {
		await expect(
			mcpPlugin.execute({
				node: {
					id: "m1",
					type: "mcp",
					data: { server: "svc", tool: "echo" },
				},
				input: {},
				flowInput: {},
				vars: {},
				nodeOutputs: {},
				resolveTemplate: (t) => t,
				fetch: globalThis.fetch,
			}),
		).rejects.toThrow(/not available/);
	});
});
