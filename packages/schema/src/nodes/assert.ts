import { z } from "zod";

export const assertCheckSchema = z.object({
	path: z.string().min(1),
	equals: z.unknown().optional(),
});

export const assertNodeDataSchema = z.object({
	label: z.string().optional(),
	checks: z.array(assertCheckSchema).min(1),
});

export type AssertNodeData = z.infer<typeof assertNodeDataSchema>;
