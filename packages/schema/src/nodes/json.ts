import { z } from "zod";

export const jsonNodeDataSchema = z.object({
	label: z.string().optional(),
	source: z.enum(["previous", "input"]).default("previous"),
	/** Optional JMESPath to pick a subset for display. */
	expression: z.string().optional(),
});

export type JsonNodeData = z.infer<typeof jsonNodeDataSchema>;
