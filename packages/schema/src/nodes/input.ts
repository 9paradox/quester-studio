import { z } from "zod";

export const inputNodeDataSchema = z.object({
	label: z.string().optional(),
	schema: z.record(z.unknown()).optional(),
});

export type InputNodeData = z.infer<typeof inputNodeDataSchema>;
