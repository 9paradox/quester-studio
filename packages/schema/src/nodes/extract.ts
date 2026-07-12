import { z } from "zod";

export const extractNodeDataSchema = z.object({
	label: z.string().optional(),
	expression: z.string().min(1),
});

export type ExtractNodeData = z.infer<typeof extractNodeDataSchema>;
