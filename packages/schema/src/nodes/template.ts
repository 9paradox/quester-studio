import { z } from "zod";

export const templateNodeDataSchema = z.object({
	label: z.string().optional(),
	template: z.string().min(1),
	/** `eta` (default): Eta JS in-process. `safe`: `{{…}}` interpolation only. */
	mode: z.enum(["eta", "safe"]).default("eta"),
});

export type TemplateNodeData = z.infer<typeof templateNodeDataSchema>;
