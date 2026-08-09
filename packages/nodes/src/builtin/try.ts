import { tryNodeDataSchema } from "@quester-studio/schema";
import type { FlowNodePlugin } from "../types.js";

/**
 * Framed try — body execution is owned by the engine.
 * Plugin remains registered for registry completeness.
 */
export const tryPlugin: FlowNodePlugin = {
	type: "try",
	async execute(ctx) {
		tryNodeDataSchema.parse(ctx.node.data);
		return {
			output: ctx.input,
			branch: "success",
		};
	},
};
