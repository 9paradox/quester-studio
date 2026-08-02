import type { SuiteV1 } from "./suite.js";
import { suiteSchemaV1 } from "./suite.js";
import type { ValidationResult } from "./validation-types.js";

export function validateSuite(input: unknown): ValidationResult<SuiteV1> {
	const parsed = suiteSchemaV1.safeParse(input);
	if (!parsed.success) {
		return {
			success: false,
			error: "Invalid suite",
			issues: parsed.error.issues.map((i) => ({
				path: i.path.join(".") || "(root)",
				message: i.message,
			})),
		};
	}
	return { success: true, data: parsed.data };
}
