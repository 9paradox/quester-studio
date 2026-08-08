import { z } from "zod";

/** Canvas sticky body size in CSS pixels. */
export const NOTE_FONT_SIZE_MIN = 10;
export const NOTE_FONT_SIZE_MAX = 48;
export const NOTE_FONT_SIZE_DEFAULT = 12;

export const noteNodeDataSchema = z.object({
	label: z.string().optional(),
	/** Plain-text body shown on the canvas sticky. */
	text: z.string().default(""),
	/** Body font size in CSS pixels. */
	fontSize: z
		.number()
		.int()
		.min(NOTE_FONT_SIZE_MIN)
		.max(NOTE_FONT_SIZE_MAX)
		.default(NOTE_FONT_SIZE_DEFAULT),
});

export type NoteNodeData = z.infer<typeof noteNodeDataSchema>;
