import { z } from "zod";

export const apiKeyNodeDataSchema = z.object({
	label: z.string().optional(),
	name: z.string().min(1),
	value: z.string().min(1),
	in: z.enum(["header", "query"]).default("header"),
});

export type ApiKeyNodeData = z.infer<typeof apiKeyNodeDataSchema>;
