import { z } from "zod";

export const basicAuthNodeDataSchema = z.object({
	label: z.string().optional(),
	username: z.string(),
	password: z.string().min(1),
});

export type BasicAuthNodeData = z.infer<typeof basicAuthNodeDataSchema>;
