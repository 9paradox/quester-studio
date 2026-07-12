import { jsonNodeDataSchema } from "@quester/schema";
import jmespath from "jmespath";
import type { FlowNodePlugin } from "../types.js";

export const jsonPlugin: FlowNodePlugin = {
	type: "json",
	async execute(ctx) {
		const data = jsonNodeDataSchema.parse(ctx.node.data);
		const source = data.source === "input" ? ctx.flowInput : ctx.input;
		const value = data.expression?.trim()
			? jmespath.search(source, data.expression)
			: source;
		return { output: value };
	},
};
