import { outputNodeDataSchema } from "@quester/schema";
import type { FlowNodePlugin } from "../types.js";

export const outputPlugin: FlowNodePlugin = {
	type: "output",
	async execute(ctx) {
		const data = outputNodeDataSchema.parse(ctx.node.data);
		if (!data.map) {
			return { output: ctx.input };
		}
		const out: Record<string, unknown> = {};
		for (const [key, template] of Object.entries(data.map)) {
			const resolved = ctx.resolveTemplate(template);
			try {
				out[key] = JSON.parse(resolved);
			} catch {
				out[key] = resolved;
			}
		}
		return { output: out };
	},
};
