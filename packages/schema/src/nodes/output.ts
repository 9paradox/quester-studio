import { z } from "zod";

export const outputNodeDataSchema = z.object({
	label: z.string().optional(),
	map: z.record(z.string()).optional(),
});

export type OutputNodeData = z.infer<typeof outputNodeDataSchema>;
