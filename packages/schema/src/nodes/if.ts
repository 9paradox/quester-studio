import { z } from "zod";

export const ifNodeDataSchema = z.object({
	label: z.string().optional(),
	condition: z.string().min(1),
});

export type IfNodeData = z.infer<typeof ifNodeDataSchema>;
