import { type FormV1, formDefinitionSchemaV1 } from "./form.js";
import type { ValidationResult } from "./validation-types.js";

export function validateForm(data: unknown): ValidationResult<FormV1> {
	const parsed = formDefinitionSchemaV1.safeParse(data);
	if (!parsed.success) {
		return {
			success: false,
			error: parsed.error.issues
				.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
				.join("; "),
		};
	}

	const form = parsed.data;
	const ids = new Set<string>();
	for (const field of form.fields) {
		if (ids.has(field.id)) {
			return {
				success: false,
				error: `duplicate field id: ${field.id}`,
			};
		}
		ids.add(field.id);
		if (field.type === "select") {
			const hasStatic = (field.options?.length ?? 0) > 0;
			const hasFrom = field.optionsFrom !== undefined;
			if (!hasStatic && !hasFrom) {
				return {
					success: false,
					error: `select field "${field.id}" requires options or optionsFrom`,
				};
			}
		}
	}

	return { success: true, data: form };
}
