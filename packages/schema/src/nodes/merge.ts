import { z } from "zod";

export const mergeNodeDataSchema = z.object({
	label: z.string().optional(),
	/**
	 * Sources to deep-merge left-to-right.
	 * Use `previous`, `input`, `vars`, or a node id from `nodeOutputs`.
	 */
	sources: z.array(z.string().min(1)).min(1),
});

export type MergeNodeData = z.infer<typeof mergeNodeDataSchema>;
