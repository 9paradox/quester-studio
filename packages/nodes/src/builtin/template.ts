import { templateNodeDataSchema } from "@quester-studio/schema";
import { Eta } from "eta";
import { coerceJsonValue } from "../json-coerce.js";
import type { FlowNodePlugin } from "../types.js";

const eta = new Eta({ autoEscape: false });

const ETA_TAG_RE = /<%[=_-]?/;

export function templateContainsEtaTags(template: string): boolean {
	return ETA_TAG_RE.test(template);
}

/** Prefer object/array output when the rendered body is valid JSON. */
export function coerceTemplateOutput(rendered: string): unknown {
	return coerceJsonValue(rendered);
}

export const templatePlugin: FlowNodePlugin = {
	type: "template",
	async execute(ctx) {
		const data = templateNodeDataSchema.parse(ctx.node.data);
		const mode = data.mode ?? "eta";
		const resolved = ctx.resolveTemplate(data.template);

		if (mode === "safe") {
			if (
				templateContainsEtaTags(data.template) ||
				templateContainsEtaTags(resolved)
			) {
				throw new Error(
					'template mode "safe" does not allow Eta tags (<% %> / <%= %>). Use mode "eta" or remove Eta syntax.',
				);
			}
			return { output: coerceTemplateOutput(resolved) };
		}

		const rendered = eta.renderString(resolved, {
			input: ctx.flowInput,
			vars: ctx.vars,
			nodes: ctx.nodeOutputs,
			previous: ctx.input,
		});
		return { output: coerceTemplateOutput(String(rendered)) };
	},
};
