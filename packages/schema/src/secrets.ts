import { z } from "zod";
import { SECRETS_VERSION } from "./common.js";

export const secretsSchemaV1 = z.object({
  version: z.literal(SECRETS_VERSION),
  secrets: z.record(z.string()).default({}),
});

export type SecretsV1 = z.infer<typeof secretsSchemaV1>;
