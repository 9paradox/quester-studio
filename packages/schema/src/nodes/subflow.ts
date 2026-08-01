import { z } from "zod";

export const subflowNodeDataSchema = z.object({
	label: z.string().optional(),
	/** Target flow id (without `.flow.json`). */
	flowId: z.string().min(1),
	/** Optional input fields; values are templates resolved before the subflow run. */
	input: z.record(z.string()).optional(),
});

export type SubflowNodeData = z.infer<typeof subflowNodeDataSchema>;
