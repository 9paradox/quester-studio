import { jsonNodeDataSchema } from "@quester/schema";
import jmespath from "jmespath";
import type { FlowNodePlugin } from "../types.js";

export const jsonPlugin: FlowNodePlugin = {
	type: "json",
	async execute(ctx) {
		const data = jsonNodeDataSchema.parse(ctx.node.data);
		const value = data.expression?.trim()
			? jmespath.search(ctx.input, data.expression)
			: ctx.input;
		return { output: value };
	},
};
