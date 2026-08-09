import { z } from "zod";

/** AND/XOR barrier — collects predecessor outputs keyed by node id. */
export const joinNodeDataSchema = z.object({
	label: z.string().optional(),
});

export type JoinNodeData = z.infer<typeof joinNodeDataSchema>;
