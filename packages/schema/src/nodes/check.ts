import { z } from "zod";

export const checkOps = [
	"eq",
	"neq",
	"gt",
	"gte",
	"lt",
	"lte",
	"contains",
	"notContains",
	"startsWith",
	"endsWith",
	"matches",
	"exists",
	"truthy",
	"falsy",
] as const;

export type CheckOp = (typeof checkOps)[number];

export const checkOpSchema = z.enum(checkOps);

/** Ops that require a comparison `value` (or legacy `equals` for `eq`). */
export const checkOpsNeedingValue: ReadonlySet<CheckOp> = new Set([
	"eq",
	"neq",
	"gt",
	"gte",
	"lt",
	"lte",
	"contains",
	"notContains",
	"startsWith",
	"endsWith",
	"matches",
]);

/**
 * Shared value check for `assert` and `if`.
 *
 * - Legacy: `{ path }` → truthy; `{ path, equals }` → eq
 * - New: `{ path, op, value? }`
 */
export const valueCheckSchema = z
	.object({
		path: z.string().min(1),
		op: checkOpSchema.optional(),
		value: z.unknown().optional(),
		/** @deprecated Prefer `op: "eq"` + `value`. Still accepted. */
		equals: z.unknown().optional(),
	})
	.superRefine((check, ctx) => {
		const hasEquals = Object.hasOwn(check, "equals");
		const hasValue = Object.hasOwn(check, "value");
		const op = check.op ?? (hasEquals ? "eq" : "truthy");

		if (
			checkOpsNeedingValue.has(op) &&
			!hasValue &&
			!(op === "eq" && hasEquals)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Check op "${op}" requires value`,
				path: ["value"],
			});
		}
	});

export type ValueCheck = z.infer<typeof valueCheckSchema>;
