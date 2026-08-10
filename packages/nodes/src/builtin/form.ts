import { type FormV1, formNodeDataSchema } from "@quester-studio/schema";
import type { FlowNodePlugin } from "../types.js";
import {
	mergeFormSubmission,
	resolveFormFields,
	validateFormSubmission,
} from "./form-resolve.js";

export const formPlugin: FlowNodePlugin = {
	type: "form",
	async execute(ctx) {
		const data = formNodeDataSchema.parse(ctx.node.data);
		if (!ctx.getForm) {
			throw new Error(
				`Form node "${ctx.node.id}" requires workspace form loading (getForm)`,
			);
		}
		if (!ctx.awaitForm) {
			throw new Error(
				`Form node "${ctx.node.id}" requires awaitForm (desktop UI or CLI --forms)`,
			);
		}

		const form: FormV1 = await ctx.getForm(data.formId);
		const resolveValue =
			ctx.resolveValue ?? ((template: string) => ctx.resolveTemplate(template));

		const resolved = resolveFormFields(
			form,
			data.value,
			resolveValue,
			ctx.resolveTemplate,
		);

		const submitted = await ctx.awaitForm({
			nodeId: ctx.node.id,
			formId: data.formId,
			form,
			resolved,
		});

		const merged = mergeFormSubmission(resolved, submitted);
		validateFormSubmission(resolved, merged);

		return {
			output: merged,
			processedInput: {
				formId: data.formId,
				resolved,
				submitted,
			},
		};
	},
};
