import { z } from "zod";

export const startNodeDataSchema = z.object({
	label: z.string().optional(),
});

export type StartNodeData = z.infer<typeof startNodeDataSchema>;
