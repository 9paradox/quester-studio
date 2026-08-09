import { z } from "zod";

/** Framed exception-boundary container — body children only; no soft condition/checks. */
export const tryNodeDataSchema = z
	.object({
		label: z.string().optional(),
		condition: z.unknown().optional(),
		checks: z.unknown().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.condition !== undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"soft-try removed; use `if` for soft branching (framed `try` catches thrown errors)",
				path: ["condition"],
			});
		}
		if (data.checks !== undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"soft-try removed; use `if` for soft branching (framed `try` catches thrown errors)",
				path: ["checks"],
			});
		}
	})
	.transform(({ label }) => ({ label }));

export type TryNodeData = { label?: string };
