import { workspaceSchemaV1, type WorkspaceV1 } from "./workspace.js";
import type { ValidationResult } from "./validation-types.js";

export function validateWorkspace(input: unknown): ValidationResult<WorkspaceV1> {
  const parsed = workspaceSchemaV1.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }
  return { success: true, data: parsed.data };
}
