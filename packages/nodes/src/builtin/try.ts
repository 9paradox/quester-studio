import { type ValueCheck, tryNodeDataSchema } from "@quester-studio/schema";
import jmespath from "jmespath";
import type { FlowNodePlugin, NodeExecutionContext } from "../types.js";
import {
	evaluateNormalizedCheck,
	normalizeValueCheck,
} from "./evaluate-check.js";

function evalCondition(expr: string, ctx: NodeExecutionContext): boolean {
	const resolved = ctx.resolveTemplate(expr);
	if (resolved === "true") return true;
	if (resolved === "false") return false;
	return Boolean(resolved && resolved !== "0" && resolved !== "");
}

function evalChecks(checks: ValueCheck[], input: unknown): boolean {
	for (const check of checks) {
		const normalized = normalizeValueCheck(check);
		const value = jmespath.search(input, normalized.path);
		const result = evaluateNormalizedCheck(value, normalized);
		if (!result.ok) return false;
	}
	return true;
}

export const tryPlugin: FlowNodePlugin = {
	type: "try",
	async execute(ctx) {
		const data = tryNodeDataSchema.parse(ctx.node.data);
		let ok = true;
		if (data.checks !== undefined) {
			ok = evalChecks(data.checks, ctx.input);
		}
		if (data.condition !== undefined) {
			ok = ok && evalCondition(data.condition, ctx);
		}
		return {
			output: { ok, input: ctx.input },
			branch: ok ? "ok" : "catch",
		};
	},
};
