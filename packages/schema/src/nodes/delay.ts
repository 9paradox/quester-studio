import { z } from "zod";

export const delayNodeDataSchema = z.object({
	label: z.string().optional(),
	ms: z.number().nonnegative(),
	jitterMs: z.number().nonnegative().optional(),
});

export type DelayNodeData = z.infer<typeof delayNodeDataSchema>;
