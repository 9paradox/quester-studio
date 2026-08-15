import { z } from "zod";

export const bearerNodeDataSchema = z.object({
	label: z.string().optional(),
	token: z.string().min(1),
});

export type BearerNodeData = z.infer<typeof bearerNodeDataSchema>;
