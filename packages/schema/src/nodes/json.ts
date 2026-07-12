import { z } from "zod";

export const jsonNodeDataSchema = z.object({
	label: z.string().optional(),
	/** Optional JMESPath to pick a subset of the previous node output. */
	expression: z.string().optional(),
});

export type JsonNodeData = z.infer<typeof jsonNodeDataSchema>;
