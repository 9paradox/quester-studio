import type {
	FormFieldV1,
	FormSelectOption,
	FormV1,
} from "@quester-studio/schema";

export type ResolvedFormField = {
	id: string;
	type: FormFieldV1["type"];
	label?: string;
	description?: string;
	placeholder?: string;
	required: boolean;
	readonly: boolean;
	/** Prefill shown in UI / used when submission omits the field. */
	value: unknown;
	options?: FormSelectOption[];
};

export type ResolvedFormFields = {
	fields: ResolvedFormField[];
};

function asRecord(value: unknown): Record<string, unknown> {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return {};
}

function getPath(obj: unknown, path: string): unknown {
	if (!path) return obj;
	const parts = path.split(".");
	let cur: unknown = obj;
	for (const part of parts) {
		if (cur === null || cur === undefined) return undefined;
		if (typeof cur !== "object") return undefined;
		cur = (cur as Record<string, unknown>)[part];
	}
	return cur;
}

function resolveMaybeTemplate(
	raw: unknown,
	resolveValue: (template: string) => unknown,
	resolveTemplate: (template: string) => string,
): unknown {
	if (typeof raw !== "string") return raw;
	if (!raw.includes("{{")) return raw;
	const trimmed = raw.trim();
	if (/^\{\{[^}]+\}\}$/.test(trimmed)) {
		return resolveValue(trimmed);
	}
	return resolveTemplate(raw);
}

function readProp(item: unknown, key: string): unknown {
	if (!item || typeof item !== "object") return undefined;
	return (item as Record<string, unknown>)[key];
}

function optionLabel(value: unknown): string {
	if (value === undefined || value === null) return "";
	return String(value);
}

const ITEM_LABEL_TOKEN_RE = /\{\{([^}]+)\}\}/g;

/** Resolve `{{title}} · {{brand}}` against one optionsFrom item. */
export function resolveItemLabelTemplate(
	template: string,
	item: unknown,
): string {
	return template.replace(ITEM_LABEL_TOKEN_RE, (_match, inner: string) => {
		let path = String(inner).trim();
		if (path.startsWith("item.")) path = path.slice("item.".length);
		return optionLabel(getPath(item, path));
	});
}

/**
 * `label` is either a property name (`title`) or a per-item template
 * containing `{{…}}` tokens (`{{title}} · {{brand}} · ${{price}}`).
 * Property mode falls back to `fallbackValue` when the key is missing.
 */
export function resolveOptionLabel(
	item: unknown,
	labelSpec: string,
	fallbackValue?: unknown,
): string {
	if (labelSpec.includes("{{")) {
		return resolveItemLabelTemplate(labelSpec, item);
	}
	const raw = readProp(item, labelSpec);
	return optionLabel(raw !== undefined ? raw : fallbackValue);
}

function stringifyResolved(value: unknown): string {
	if (value === undefined || value === null) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean")
		return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

/** Resolve a bindings/prefill record with the flow template scope. */
export function resolveBindingsRecord(
	raw: Record<string, unknown> | undefined,
	resolveValue: (template: string) => unknown,
	resolveTemplate: (template: string) => string,
): Record<string, unknown> {
	if (!raw) return {};
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(raw)) {
		out[key] = resolveMaybeTemplate(value, resolveValue, resolveTemplate);
	}
	return out;
}

/**
 * Wrap flow resolvers so `{{form.*}}` reads from the resolved bindings map.
 */
export function withFormTemplateScope(
	formScope: Record<string, unknown>,
	resolveValue: (template: string) => unknown,
	resolveTemplate: (template: string) => string,
): {
	resolveValue: (template: string) => unknown;
	resolveTemplate: (template: string) => string;
} {
	const resolveTemplateWithForm = (template: string): string =>
		template.replace(ITEM_LABEL_TOKEN_RE, (_match, inner: string) => {
			const trimmed = String(inner).trim();
			if (trimmed === "form") return stringifyResolved(formScope);
			if (trimmed.startsWith("form.")) {
				return stringifyResolved(
					getPath(formScope, trimmed.slice("form.".length)),
				);
			}
			return stringifyResolved(resolveValue(`{{${trimmed}}}`));
		});

	const resolveValueWithForm = (template: string): unknown => {
		const trimmed = template.trim();
		const single = /^\{\{\s*([^}]+?)\s*\}\}$/.exec(trimmed);
		if (single?.[1]) {
			const inner = single[1].trim();
			if (inner === "form") return formScope;
			if (inner.startsWith("form.")) {
				return getPath(formScope, inner.slice("form.".length));
			}
			return resolveValue(template);
		}
		if (template.includes("{{")) return resolveTemplateWithForm(template);
		return resolveTemplate(template);
	};

	return {
		resolveValue: resolveValueWithForm,
		resolveTemplate: resolveTemplateWithForm,
	};
}

/** Ensure required form inputs have bindings (after resolve). */
export function assertRequiredFormBindings(
	form: FormV1,
	formScope: Record<string, unknown>,
): void {
	for (const input of form.inputs ?? []) {
		if (input.required !== true) continue;
		const value = formScope[input.id];
		if (
			value === undefined ||
			value === null ||
			(typeof value === "string" && value.trim() === "")
		) {
			throw new Error(
				`Form "${form.id}" requires binding for input "${input.id}"`,
			);
		}
	}
}

export function resolveSelectOptions(
	field: Extract<FormFieldV1, { type: "select" }>,
	resolveValue: (template: string) => unknown,
): FormSelectOption[] {
	if (field.optionsFrom) {
		const from = field.optionsFrom;
		const itemsRaw = resolveValue(from.items);
		if (!Array.isArray(itemsRaw)) {
			throw new Error(
				`Form field "${field.id}" optionsFrom.items must resolve to an array`,
			);
		}
		return itemsRaw.map((item, index) => {
			const value = readProp(item, from.value);
			if (value === undefined) {
				throw new Error(
					`Form field "${field.id}" optionsFrom item[${index}] missing "${from.value}"`,
				);
			}
			const label = resolveOptionLabel(item, from.label, value);
			return {
				value: value as string | number | boolean,
				label: label || String(index),
			};
		});
	}
	return field.options ?? [];
}

export function resolveFormFields(
	form: FormV1,
	nodeValue: Record<string, unknown> | undefined,
	resolveValue: (template: string) => unknown,
	resolveTemplate: (template: string) => string,
): ResolvedFormFields {
	const draft = nodeValue ?? {};
	const fields: ResolvedFormField[] = form.fields.map((field) => {
		const fromNode = Object.hasOwn(draft, field.id)
			? resolveMaybeTemplate(draft[field.id], resolveValue, resolveTemplate)
			: undefined;
		const fromDefault =
			field.default !== undefined
				? resolveMaybeTemplate(field.default, resolveValue, resolveTemplate)
				: undefined;
		const value = fromNode !== undefined ? fromNode : fromDefault;
		const base: ResolvedFormField = {
			id: field.id,
			type: field.type,
			label: field.label,
			description: field.description,
			placeholder: field.placeholder,
			required: field.required === true,
			readonly: field.readonly === true,
			value,
		};
		if (field.type === "select") {
			base.options = resolveSelectOptions(field, resolveValue);
		}
		return base;
	});
	return { fields };
}

export function coerceFieldValue(
	field: ResolvedFormField,
	raw: unknown,
): unknown {
	if (raw === undefined) return undefined;
	switch (field.type) {
		case "string":
			return raw === null ? "" : String(raw);
		case "number": {
			if (typeof raw === "number") return raw;
			if (typeof raw === "string" && raw.trim() !== "") {
				const n = Number(raw);
				if (Number.isNaN(n)) {
					throw new Error(`Form field "${field.id}" must be a number`);
				}
				return n;
			}
			throw new Error(`Form field "${field.id}" must be a number`);
		}
		case "boolean":
			if (typeof raw === "boolean") return raw;
			if (raw === "true") return true;
			if (raw === "false") return false;
			throw new Error(`Form field "${field.id}" must be a boolean`);
		case "json":
			if (typeof raw === "string") {
				try {
					return JSON.parse(raw) as unknown;
				} catch {
					throw new Error(`Form field "${field.id}" must be valid JSON`);
				}
			}
			return raw;
		case "select":
			return raw;
		default:
			return raw;
	}
}

function isEmpty(value: unknown): boolean {
	return (
		value === undefined ||
		value === null ||
		(typeof value === "string" && value.trim() === "")
	);
}

/** Merge submitted values with resolved defaults; readonly always uses default. */
export function mergeFormSubmission(
	resolved: ResolvedFormFields,
	submitted: unknown,
): Record<string, unknown> {
	const src = asRecord(submitted);
	const out: Record<string, unknown> = {};
	for (const field of resolved.fields) {
		if (field.readonly) {
			out[field.id] = field.value;
			continue;
		}
		if (Object.hasOwn(src, field.id)) {
			out[field.id] = coerceFieldValue(field, src[field.id]);
		} else {
			out[field.id] = field.value;
		}
	}
	return out;
}

export function validateFormSubmission(
	resolved: ResolvedFormFields,
	values: Record<string, unknown>,
): void {
	for (const field of resolved.fields) {
		const value = values[field.id];
		if (field.required && isEmpty(value)) {
			throw new Error(`Form field "${field.id}" is required`);
		}
		if (field.type === "select" && !isEmpty(value) && field.options) {
			const ok = field.options.some((o) => o.value === value);
			if (!ok) {
				throw new Error(
					`Form field "${field.id}" value is not in the resolved options`,
				);
			}
		}
	}
}
