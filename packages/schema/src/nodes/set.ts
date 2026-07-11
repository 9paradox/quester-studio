import { z } from "zod";

export const setNodeDataSchema = z.object({
  label: z.string().optional(),
  variables: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export type SetNodeData = z.infer<typeof setNodeDataSchema>;
