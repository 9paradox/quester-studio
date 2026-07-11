import { setNodeDataSchema } from "@quester/schema";
import type { FlowNodePlugin } from "../types.js";

export const setPlugin: FlowNodePlugin = {
	type: "set",
	async execute(ctx) {
		const data = setNodeDataSchema.parse(ctx.node.data);
		const next: Record<string, unknown> = { ...ctx.vars };
		for (const [key, raw] of Object.entries(data.variables)) {
			next[key] = typeof raw === "string" ? ctx.resolveTemplate(raw) : raw;
		}
		return { output: ctx.input, vars: next };
	},
};
