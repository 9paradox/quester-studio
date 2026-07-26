import { z } from "zod";
import { valueCheckSchema } from "./check.js";

export const ifNodeDataSchema = z
	.object({
		label: z.string().optional(),
		/** Templated truthy string. Optional when `checks` is set. */
		condition: z.string().min(1).optional(),
		/** JMESPath checks on previous output (same ops as `assert`). */
		checks: z.array(valueCheckSchema).min(1).optional(),
	})
	.superRefine((data, ctx) => {
		if (data.condition === undefined && data.checks === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Provide condition and/or checks",
			});
		}
	});

export type IfNodeData = z.infer<typeof ifNodeDataSchema>;
