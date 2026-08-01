import { z } from "zod";

export const logNodeDataSchema = z.object({
	label: z.string().optional(),
	/** Templated message written to the run log (passthrough output). */
	message: z.string().min(1),
});

export type LogNodeData = z.infer<typeof logNodeDataSchema>;
