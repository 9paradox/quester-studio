import { noteNodeDataSchema } from "@quester-studio/schema";
import type { FlowNodePlugin } from "../types.js";

/**
 * Canvas sticky — not connected in a valid graph. Passthrough for registry
 * completeness if somehow reached.
 */
export const notePlugin: FlowNodePlugin = {
	type: "note",
	async execute(ctx) {
		noteNodeDataSchema.parse(ctx.node.data);
		return { output: ctx.input };
	},
};
