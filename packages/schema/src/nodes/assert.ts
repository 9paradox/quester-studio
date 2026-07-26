import { z } from "zod";
import { valueCheckSchema } from "./check.js";

export const assertCheckSchema = valueCheckSchema;

export const assertNodeDataSchema = z.object({
	label: z.string().optional(),
	checks: z.array(assertCheckSchema).min(1),
});

export type AssertNodeData = z.infer<typeof assertNodeDataSchema>;
