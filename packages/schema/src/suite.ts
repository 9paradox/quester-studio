import { z } from "zod";

export const SUITE_VERSION = "v1" as const;

export const suiteFlowEntrySchemaV1 = z.object({
	id: z.string().min(1),
	input: z.unknown().optional(),
});

export const suiteSchemaV1 = z.object({
	id: z.string().min(1),
	version: z.literal(SUITE_VERSION),
	name: z.string().optional(),
	env: z.string().min(1).default("local"),
	flows: z.array(suiteFlowEntrySchemaV1).min(1),
});

export type SuiteFlowEntryV1 = z.infer<typeof suiteFlowEntrySchemaV1>;
export type SuiteV1 = z.infer<typeof suiteSchemaV1>;
