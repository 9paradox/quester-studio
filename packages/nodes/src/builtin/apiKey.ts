import { apiKeyNodeDataSchema } from "@quester-studio/schema";
import type { FlowNodePlugin } from "../types.js";
import { mergeAuthVars } from "./http-auth-vars.js";

export const apiKeyPlugin: FlowNodePlugin = {
	type: "apiKey",
	async execute(ctx) {
		const data = apiKeyNodeDataSchema.parse(ctx.node.data);
		const name = ctx.resolveTemplate(data.name).trim();
		const value = ctx.resolveTemplate(data.value);
		if (!name) {
			throw new Error("apiKey name is empty after template resolve");
		}
		if (!value) {
			throw new Error("apiKey value is empty after template resolve");
		}
		const inQuery = data.in === "query";
		return {
			output: ctx.input,
			vars: mergeAuthVars(ctx.vars, {
				...(inQuery
					? { query: { [name]: value } }
					: { headers: { [name]: value } }),
			}),
			processedInput: {
				applied: true,
				kind: "apiKey",
				in: data.in,
				name,
			},
		};
	},
};
