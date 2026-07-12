import { z } from "zod";

export const transformNodeDataSchema = z.object({
	label: z.string().optional(),
	/** Map of output key → JMESPath expression over previous input. */
	map: z.record(z.string()).default({}),
});

export type TransformNodeData = z.infer<typeof transformNodeDataSchema>;
