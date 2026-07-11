import { z } from "zod";

export const templateNodeDataSchema = z.object({
  label: z.string().optional(),
  template: z.string().min(1),
});

export type TemplateNodeData = z.infer<typeof templateNodeDataSchema>;
