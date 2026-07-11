import { z } from "zod";

export const httpNodeDataSchema = z.object({
  label: z.string().optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]).default("GET"),
  url: z.string().min(1),
  headers: z.record(z.string()).default({}),
  body: z.union([z.string(), z.record(z.unknown())]).optional(),
});

export type HttpNodeData = z.infer<typeof httpNodeDataSchema>;
