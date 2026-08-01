import { z } from "zod";

export const switchCaseSchema = z.object({
	value: z.string(),
	handle: z.string().min(1),
});

export const switchNodeDataSchema = z
	.object({
		label: z.string().optional(),
		/** Templated expression evaluated as a string for case matching. */
		expression: z.string().min(1).optional(),
		/** JMESPath on previous output; result stringified for case matching. */
		path: z.string().min(1).optional(),
		cases: z.array(switchCaseSchema).min(1),
		defaultHandle: z.string().min(1).optional(),
	})
	.superRefine((data, ctx) => {
		if (data.expression === undefined && data.path === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Provide expression and/or path",
			});
		}
	});

export type SwitchCase = z.infer<typeof switchCaseSchema>;
export type SwitchNodeData = z.infer<typeof switchNodeDataSchema>;
