import { assertNodeDataSchema } from "@quester/schema";
import jmespath from "jmespath";
import type { FlowNodePlugin } from "../types.js";

function valuesEqual(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

export const assertPlugin: FlowNodePlugin = {
	type: "assert",
	async execute(ctx) {
		const data = assertNodeDataSchema.parse(ctx.node.data);
		const failures: string[] = [];
		for (const check of data.checks) {
			const value = jmespath.search(ctx.input, check.path);
			if (check.equals !== undefined) {
				if (!valuesEqual(value, check.equals)) {
					failures.push(
						`${check.path}: expected ${JSON.stringify(check.equals)}, got ${JSON.stringify(value)}`,
					);
				}
			} else if (!value) {
				failures.push(`${check.path}: expected truthy value`);
			}
		}
		if (failures.length > 0) {
			throw new Error(`Assertion failed: ${failures.join("; ")}`);
		}
		return { output: { ok: true, failures: [] } };
	},
};
