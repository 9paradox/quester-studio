import { z } from "zod";

/** Hard ceiling for foreach `maxItems` (security / DoS guard). */
export const FOREACH_MAX_ITEMS_CEILING = 10_000;
/** Hard ceiling for foreach parallel workers. */
export const FOREACH_MAX_CONCURRENCY = 32;

export const foreachNodeDataSchema = z.object({
	label: z.string().optional(),
	/** JMESPath on previous output or templated JSON array string. */
	items: z.string().min(1),
	/** Variable name for each item when using `map` (future loop body). Default `item`. */
	itemVar: z.string().min(1).optional(),
	/** Maximum items to process (cap). Default 100; hard max {@link FOREACH_MAX_ITEMS_CEILING}. */
	maxItems: z
		.number()
		.int()
		.positive()
		.max(FOREACH_MAX_ITEMS_CEILING)
		.default(100),
	/** Optional parallel item processing limit (hard max {@link FOREACH_MAX_CONCURRENCY}). */
	concurrency: z
		.number()
		.int()
		.positive()
		.max(FOREACH_MAX_CONCURRENCY)
		.optional(),
	/** Optional JMESPath applied to each item (root is `{ [itemVar]: item }`). */
	map: z.string().min(1).optional(),
});

export type ForeachNodeData = z.infer<typeof foreachNodeDataSchema>;
