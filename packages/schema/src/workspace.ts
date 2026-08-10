import { z } from "zod";
import { WORKSPACE_VERSION } from "./common.js";
import { settingsSchemaV1 } from "./settings.js";

export const workspaceRunsSchemaV1 = z.object({
	enabled: z.boolean().default(false),
	dir: z.string().min(1).default("runs"),
});

export const workspaceSchemaV1 = z.object({
	name: z.string().min(1),
	version: z.literal(WORKSPACE_VERSION),
	description: z.string().optional(),
	flowsDir: z.string().default("flows"),
	environmentsDir: z.string().default("environments"),
	collectionsDir: z.string().default("collections"),
	formsDir: z.string().default("forms"),
	/** Optional on-disk per-step run logging (see engine RunFileLogger). */
	runs: workspaceRunsSchemaV1.optional(),
	settings: settingsSchemaV1.optional(),
});

export type WorkspaceRunsV1 = z.infer<typeof workspaceRunsSchemaV1>;
export type WorkspaceV1 = z.infer<typeof workspaceSchemaV1>;
