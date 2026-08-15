import { bearerNodeDataSchema } from "@quester-studio/schema";
import type { FlowNodePlugin } from "../types.js";
import { mergeAuthVars } from "./http-auth-vars.js";

export const bearerPlugin: FlowNodePlugin = {
	type: "bearer",
	async execute(ctx) {
		const data = bearerNodeDataSchema.parse(ctx.node.data);
		const token = ctx.resolveTemplate(data.token).trim();
		if (!token) {
			throw new Error("bearer token is empty after template resolve");
		}
		return {
			output: ctx.input,
			vars: mergeAuthVars(ctx.vars, {
				headers: { Authorization: `Bearer ${token}` },
			}),
			processedInput: {
				applied: true,
				kind: "bearer",
				header: "Authorization",
			},
		};
	},
};
