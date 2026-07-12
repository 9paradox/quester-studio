import { z } from "zod";
import { REQUEST_VERSION } from "./common.js";

export const requestSchemaV1 = z.object({
	version: z.literal(REQUEST_VERSION),
	id: z.string().min(1),
	name: z.string().min(1),
	method: z
		.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
		.default("GET"),
	url: z.string().min(1),
	headers: z.record(z.string()).default({}),
	body: z.union([z.string(), z.record(z.unknown())]).optional(),
});

export type RequestV1 = z.infer<typeof requestSchemaV1>;
