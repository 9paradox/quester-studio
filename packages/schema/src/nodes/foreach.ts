import { z } from "zod";

export const foreachNodeDataSchema = z.object({
	label: z.string().optional(),
	/** JMESPath on previous output or templated JSON array string. */
	items: z.string().min(1),
	/** Variable name for each item when using `map` (future loop body). Default `item`. */
	itemVar: z.string().min(1).optional(),
	/** Maximum items to process (cap). Default 100. */
	maxItems: z.number().int().positive().default(100),
	/** Optional parallel item processing limit. */
	concurrency: z.number().int().positive().optional(),
	/** Optional JMESPath applied to each item (root is `{ [itemVar]: item }`). */
	map: z.string().min(1).optional(),
});

export type ForeachNodeData = z.infer<typeof foreachNodeDataSchema>;
