import { mcpNodeDataSchema } from "@quester-studio/schema";
import type { FlowNodePlugin } from "../types.js";

function resolveArguments(
	raw: Record<string, unknown> | string,
	resolveTemplate: (template: string) => string,
	resolveDeep: (value: unknown) => unknown,
): Record<string, unknown> {
	if (typeof raw === "string") {
		const text = resolveTemplate(raw);
		const parsed = JSON.parse(text) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			throw new Error("mcp arguments string must resolve to a JSON object");
		}
		return parsed as Record<string, unknown>;
	}
	return resolveDeep(raw) as Record<string, unknown>;
}

function resolveDeepTemplates(
	value: unknown,
	resolveTemplate: (template: string) => string,
): unknown {
	if (typeof value === "string") {
		if (!value.includes("{{")) return value;
		return resolveTemplate(value);
	}
	if (Array.isArray(value)) {
		return value.map((item) => resolveDeepTemplates(item, resolveTemplate));
	}
	if (value && typeof value === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, child] of Object.entries(value as Record<string, unknown>)) {
			out[k] = resolveDeepTemplates(child, resolveTemplate);
		}
		return out;
	}
	return value;
}

export const mcpPlugin: FlowNodePlugin = {
	type: "mcp",
	async execute(ctx) {
		const data = mcpNodeDataSchema.parse(ctx.node.data);
		if (!ctx.callMcpTool) {
			throw new Error(
				"MCP tool calls are not available (missing workspace MCP context)",
			);
		}
		const args = resolveArguments(data.arguments, ctx.resolveTemplate, (v) =>
			resolveDeepTemplates(v, ctx.resolveTemplate),
		);
		const server = ctx.resolveTemplate(data.server);
		const tool = ctx.resolveTemplate(data.tool);
		const output = await ctx.callMcpTool({
			serverId: server,
			tool,
			arguments: args,
			timeoutMs: data.timeoutMs,
			signal: ctx.signal,
		});
		return {
			output,
			processedInput: {
				server,
				tool,
				arguments: args,
				timeoutMs: data.timeoutMs,
			},
		};
	},
};
