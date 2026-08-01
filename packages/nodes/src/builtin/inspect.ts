import { inspectNodeDataSchema } from "@quester-studio/schema";
import jmespath from "jmespath";
import type { FlowNodePlugin } from "../types.js";

export const inspectPlugin: FlowNodePlugin = {
	type: "inspect",
	async execute(ctx) {
		const data = inspectNodeDataSchema.parse(ctx.node.data);
		const value = data.expression?.trim()
			? jmespath.search(ctx.input, data.expression)
			: ctx.input;
		return { output: value };
	},
};
