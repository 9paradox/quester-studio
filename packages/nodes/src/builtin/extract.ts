import { extractNodeDataSchema } from "@quester/schema";
import jmespath from "jmespath";
import type { FlowNodePlugin } from "../types.js";

export const extractPlugin: FlowNodePlugin = {
	type: "extract",
	async execute(ctx) {
		const data = extractNodeDataSchema.parse(ctx.node.data);
		const value = jmespath.search(ctx.input, data.expression);
		return { output: value };
	},
};
