import { logNodeDataSchema } from "@quester-studio/schema";
import type { FlowNodePlugin } from "../types.js";

export const logPlugin: FlowNodePlugin = {
	type: "log",
	async execute(ctx) {
		const data = logNodeDataSchema.parse(ctx.node.data);
		const message = ctx.resolveTemplate(data.message);
		const base =
			typeof ctx.input === "object" &&
			ctx.input !== null &&
			!Array.isArray(ctx.input)
				? { ...(ctx.input as Record<string, unknown>) }
				: { value: ctx.input };
		return { output: { ...base, logged: message } };
	},
};
