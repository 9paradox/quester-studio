import { type EnvironmentV1, environmentSchemaV1 } from "./environment.js";
import type { ValidationResult } from "./validation-types.js";

export function validateEnvironment(
	input: unknown,
): ValidationResult<EnvironmentV1> {
	const parsed = environmentSchemaV1.safeParse(input);
	if (!parsed.success) {
		return { success: false, error: parsed.error.message };
	}
	return { success: true, data: parsed.data };
}
