import type { FlowNodePlugin } from "../types.js";

export const inputPlugin: FlowNodePlugin = {
	type: "input",
	async execute(ctx) {
		return { output: ctx.flowInput };
	},
};
