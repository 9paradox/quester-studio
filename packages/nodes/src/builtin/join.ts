import { joinNodeDataSchema } from "@quester-studio/schema";
import type { FlowNodePlugin } from "../types.js";

/**
 * Barrier node: engine waits for all live predecessors, then this plugin
 * emits their outputs keyed by predecessor node id.
 */
export const joinPlugin: FlowNodePlugin = {
	type: "join",
	async execute(ctx) {
		joinNodeDataSchema.parse(ctx.node.data);
		const input = ctx.input;
		if (typeof input === "object" && input !== null && !Array.isArray(input)) {
			return { output: input };
		}
		return { output: {} };
	},
};
