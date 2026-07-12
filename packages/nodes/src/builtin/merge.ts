import { mergeNodeDataSchema } from "@quester/schema";
import type { FlowNodePlugin } from "../types.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(
	target: Record<string, unknown>,
	source: Record<string, unknown>,
): Record<string, unknown> {
	const out: Record<string, unknown> = { ...target };
	for (const [key, value] of Object.entries(source)) {
		const existing = out[key];
		if (isPlainObject(existing) && isPlainObject(value)) {
			out[key] = deepMerge(existing, value);
		} else {
			out[key] = value;
		}
	}
	return out;
}

function resolveSource(
	name: string,
	ctx: {
		input: unknown;
		flowInput: unknown;
		vars: Record<string, unknown>;
		nodeOutputs: Record<string, unknown>;
	},
): unknown {
	if (name === "previous") return ctx.input;
	if (name === "input") return ctx.flowInput;
	if (name === "vars") return ctx.vars;
	return ctx.nodeOutputs[name];
}

export const mergePlugin: FlowNodePlugin = {
	type: "merge",
	async execute(ctx) {
		const data = mergeNodeDataSchema.parse(ctx.node.data);
		let merged: Record<string, unknown> = {};
		for (const source of data.sources) {
			const value = resolveSource(source, ctx);
			if (isPlainObject(value)) {
				merged = deepMerge(merged, value);
			} else if (value !== undefined) {
				merged = deepMerge(merged, { [source]: value });
			}
		}
		return { output: merged };
	},
};
