import { z } from "zod";

/** Hard ceiling for delay `ms` / `jitterMs` (DoS / cancel latency guard). */
export const DELAY_MS_CEILING = 3_600_000;

export const delayNodeDataSchema = z.object({
	label: z.string().optional(),
	ms: z.number().nonnegative().max(DELAY_MS_CEILING),
	jitterMs: z.number().nonnegative().max(DELAY_MS_CEILING).optional(),
});

export type DelayNodeData = z.infer<typeof delayNodeDataSchema>;
