import { foreachNodeDataSchema } from "@quester-studio/schema";
import type { FlowNodePlugin } from "../types.js";

/**
 * Framed foreach — body execution is owned by the engine.
 * Plugin remains registered for registry completeness.
 */
export const foreachPlugin: FlowNodePlugin = {
	type: "foreach",
	async execute(ctx) {
		foreachNodeDataSchema.parse(ctx.node.data);
		return {
			output: {
				results: [],
				count: 0,
				truncated: false,
			},
			branch: "complete",
		};
	},
};
