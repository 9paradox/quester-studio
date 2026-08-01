import { subflowNodeDataSchema } from "@quester-studio/schema";
import type { FlowNodePlugin } from "../types.js";

function resolveSubflowInput(
	fields: Record<string, string> | undefined,
	resolveTemplate: (template: string) => string,
): Record<string, unknown> {
	if (!fields) return {};
	const out: Record<string, unknown> = {};
	for (const [key, template] of Object.entries(fields)) {
		const resolved = resolveTemplate(template);
		try {
			out[key] = JSON.parse(resolved) as unknown;
		} catch {
			out[key] = resolved;
		}
	}
	return out;
}

export const subflowPlugin: FlowNodePlugin = {
	type: "subflow",
	async execute(ctx) {
		const data = subflowNodeDataSchema.parse(ctx.node.data);
		if (!ctx.executeSubflow) {
			throw new Error(
				"Subflow execution is not available (missing workspace context)",
			);
		}
		const input = resolveSubflowInput(data.input, ctx.resolveTemplate);
		const output = await ctx.executeSubflow(data.flowId, input);
		return { output };
	},
};
