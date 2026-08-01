import { z } from "zod";

export const noteNodeDataSchema = z.object({
	label: z.string().optional(),
	/** Plain-text body shown on the canvas sticky. */
	text: z.string().default(""),
});

export type NoteNodeData = z.infer<typeof noteNodeDataSchema>;
