import type { RequestV1 } from "./request.js";
import { requestSchemaV1 } from "./request.js";
import type { ValidationResult } from "./validation-types.js";

export function validateRequest(input: unknown): ValidationResult<RequestV1> {
	const parsed = requestSchemaV1.safeParse(input);
	if (!parsed.success) {
		return { success: false, error: parsed.error.message };
	}
	return { success: true, data: parsed.data };
}
