import { assertNodeDataSchema } from "@quester-studio/schema";
import jmespath from "jmespath";
import type { FlowNodePlugin } from "../types.js";
import {
	evaluateNormalizedCheck,
	formatCheckFailure,
	normalizeValueCheck,
} from "./evaluate-check.js";

export const assertPlugin: FlowNodePlugin = {
	type: "assert",
	async execute(ctx) {
		const data = assertNodeDataSchema.parse(ctx.node.data);
		const failures: string[] = [];
		for (const check of data.checks) {
			const normalized = normalizeValueCheck(check);
			const value = jmespath.search(ctx.input, normalized.path);
			const result = evaluateNormalizedCheck(value, normalized);
			if (!result.ok) {
				failures.push(formatCheckFailure(normalized.path, result));
			}
		}
		if (failures.length > 0) {
			throw new Error(`Assertion failed: ${failures.join("; ")}`);
		}
		return { output: { ok: true, failures: [] } };
	},
};
