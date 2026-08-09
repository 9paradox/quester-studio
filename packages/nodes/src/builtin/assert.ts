import { assertNodeDataSchema } from "@quester-studio/schema";
import jmespath from "jmespath";
import type { FlowNodePlugin } from "../types.js";
import {
	evaluateNormalizedCheck,
	formatCheckFailure,
	normalizeValueCheck,
} from "./evaluate-check.js";

export type AssertCheckResult = {
	path: string;
	ok: boolean;
	message?: string;
};

export type AssertNodeOutput = {
	ok: boolean;
	checks: AssertCheckResult[];
	/** Failure messages only (compat with older consumers). */
	failures: string[];
};

export class AssertNodeError extends Error {
	readonly output: AssertNodeOutput;

	constructor(message: string, output: AssertNodeOutput) {
		super(message);
		this.name = "AssertNodeError";
		this.output = output;
	}
}

export const assertPlugin: FlowNodePlugin = {
	type: "assert",
	async execute(ctx) {
		const data = assertNodeDataSchema.parse(ctx.node.data);
		const checks: AssertCheckResult[] = [];
		const failures: string[] = [];
		for (const check of data.checks) {
			const normalized = normalizeValueCheck(check);
			const value = jmespath.search(ctx.input, normalized.path);
			const result = evaluateNormalizedCheck(value, normalized);
			if (result.ok) {
				checks.push({ path: normalized.path, ok: true });
			} else {
				const message = formatCheckFailure(normalized.path, result);
				failures.push(message);
				checks.push({ path: normalized.path, ok: false, message });
			}
		}
		const output: AssertNodeOutput = {
			ok: failures.length === 0,
			checks,
			failures,
		};
		if (failures.length > 0) {
			throw new AssertNodeError(
				`Assertion failed: ${failures.join("; ")}`,
				output,
			);
		}
		return { output };
	},
};
