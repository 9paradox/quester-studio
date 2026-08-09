import { z } from "zod";

/** Hard ceiling for foreach `maxItems` (security / DoS guard). */
export const FOREACH_MAX_ITEMS_CEILING = 10_000;
/** Hard ceiling for foreach parallel workers. */
export const FOREACH_MAX_CONCURRENCY = 32;

/** Framed loop container — body children required; map-only mode removed. */
export const foreachNodeDataSchema = z
	.object({
		label: z.string().optional(),
		/** JMESPath on previous output or templated JSON array string. */
		items: z.string().min(1),
		/** Template scope name for each item (default `item` at runtime). */
		itemVar: z.string().min(1).optional(),
		/** Maximum items to process (cap). Default 100; hard max {@link FOREACH_MAX_ITEMS_CEILING}. */
		maxItems: z
			.number()
			.int()
			.positive()
			.max(FOREACH_MAX_ITEMS_CEILING)
			.default(100),
		/** Optional parallel body iterations (hard max {@link FOREACH_MAX_CONCURRENCY}). */
		concurrency: z
			.number()
			.int()
			.positive()
			.max(FOREACH_MAX_CONCURRENCY)
			.optional(),
		/** @deprecated Removed — use framed body subgraph. */
		map: z.unknown().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.map !== undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"map-only foreach removed; add framed body children wired with entry/exit edges",
				path: ["map"],
			});
		}
	})
	.transform(({ label, items, itemVar, maxItems, concurrency }) => ({
		label,
		items,
		itemVar,
		maxItems,
		concurrency,
	}));

export type ForeachNodeData = {
	label?: string;
	items: string;
	itemVar?: string;
	maxItems: number;
	concurrency?: number;
};
