import { extractNodeDataSchema } from "@quester-studio/schema";
import jmespath from "jmespath";
import { coerceJsonValue } from "../json-coerce.js";
import type { FlowNodePlugin } from "../types.js";

export const extractPlugin: FlowNodePlugin = {
	type: "extract",
	async execute(ctx) {
		const data = extractNodeDataSchema.parse(ctx.node.data);
		// Template (and some HTTP) outputs may still be JSON text; parse before JMESPath.
		const input = coerceJsonValue(ctx.input);
		const value = jmespath.search(input, data.expression);
		return { output: value };
	},
};
