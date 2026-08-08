import { z } from "zod";
import { ENVIRONMENT_VERSION, workspaceFileIdSchema } from "./common.js";

const envValue = z.union([z.string(), z.number(), z.boolean()]);

export const environmentSchemaV1 = z.object({
	name: workspaceFileIdSchema,
	version: z.literal(ENVIRONMENT_VERSION),
	variables: z.record(envValue).default({}),
});

export type EnvironmentV1 = z.infer<typeof environmentSchemaV1>;
