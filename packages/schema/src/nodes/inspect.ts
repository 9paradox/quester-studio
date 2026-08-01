import { z } from "zod";

export const inspectNodeDataSchema = z.object({
	label: z.string().optional(),
	/** Optional JMESPath to pick a subset of the previous node output. */
	expression: z.string().optional(),
});

export type InspectNodeData = z.infer<typeof inspectNodeDataSchema>;
