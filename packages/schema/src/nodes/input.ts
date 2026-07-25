import { z } from "zod";

export const inputNodeDataSchema = z.object({
	label: z.string().optional(),
	/** Optional JSON Schema-like hint (not enforced at execute time). */
	schema: z.record(z.unknown()).optional(),
	/**
	 * Default run payload for this flow (desktop Run panel / inspector).
	 * Persisted in the flow file; CLI `--input` still overrides at execute time.
	 */
	value: z.unknown().optional(),
});

export type InputNodeData = z.infer<typeof inputNodeDataSchema>;
