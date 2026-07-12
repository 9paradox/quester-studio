import { transformNodeDataSchema } from "@quester/schema";
import jmespath from "jmespath";
import type { FlowNodePlugin } from "../types.js";

export const transformPlugin: FlowNodePlugin = {
	type: "transform",
	async execute(ctx) {
		const data = transformNodeDataSchema.parse(ctx.node.data);
		const out: Record<string, unknown> = {};
		for (const [key, expression] of Object.entries(data.map)) {
			out[key] = jmespath.search(ctx.input, expression);
		}
		return { output: out };
	},
};
