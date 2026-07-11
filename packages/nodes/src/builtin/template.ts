import { templateNodeDataSchema } from "@quester/schema";
import { Eta } from "eta";
import type { FlowNodePlugin } from "../types.js";

const eta = new Eta({ autoEscape: false });

export const templatePlugin: FlowNodePlugin = {
	type: "template",
	async execute(ctx) {
		const data = templateNodeDataSchema.parse(ctx.node.data);
		const rendered = eta.renderString(ctx.resolveTemplate(data.template), {
			input: ctx.flowInput,
			vars: ctx.vars,
			nodes: ctx.nodeOutputs,
			previous: ctx.input,
		});
		return { output: rendered };
	},
};
