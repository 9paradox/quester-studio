import { z } from "zod";
import { WORKSPACE_VERSION } from "./common.js";

export const workspaceSchemaV1 = z.object({
	name: z.string().min(1),
	version: z.literal(WORKSPACE_VERSION),
	flowsDir: z.string().default("flows"),
	environmentsDir: z.string().default("environments"),
});

export type WorkspaceV1 = z.infer<typeof workspaceSchemaV1>;
