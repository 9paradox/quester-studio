import { basicAuthNodeDataSchema } from "@quester-studio/schema";
import type { FlowNodePlugin } from "../types.js";
import { mergeAuthVars } from "./http-auth-vars.js";

export const basicAuthPlugin: FlowNodePlugin = {
	type: "basicAuth",
	async execute(ctx) {
		const data = basicAuthNodeDataSchema.parse(ctx.node.data);
		const username = ctx.resolveTemplate(data.username);
		const password = ctx.resolveTemplate(data.password);
		if (!password) {
			throw new Error("basicAuth password is empty after template resolve");
		}
		const encoded = Buffer.from(`${username}:${password}`, "utf8").toString(
			"base64",
		);
		return {
			output: ctx.input,
			vars: mergeAuthVars(ctx.vars, {
				headers: { Authorization: `Basic ${encoded}` },
			}),
			processedInput: {
				applied: true,
				kind: "basic",
				header: "Authorization",
			},
		};
	},
};
