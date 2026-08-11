import { z } from "zod";
import { FLOW_VERSION, workspaceFileIdSchema } from "./common.js";

/** Form definition version — aligned with flow v1 line. */
export const FORM_VERSION = FLOW_VERSION;

export const formSelectOptionSchema = z.object({
	value: z.union([z.string(), z.number(), z.boolean()]),
	label: z.string().min(1),
});

export const formOptionsFromSchema = z.object({
	/** Template that resolves to an array (e.g. `{{form.products}}` or `{{nodes.list.body.products}}`). */
	items: z.string().min(1),
	/** Property name on each item for the option value. */
	value: z.string().min(1),
	/**
	 * Option label: a property name on each item (`title`), or a per-item
	 * template over that item (`{{title}} · {{brand}} · ${{price}}`).
	 * Paths may be dotted (`{{meta.sku}}`). Optional `item.` prefix is allowed.
	 */
	label: z.string().min(1),
});

/** Declared form inputs — bound per flow via the form node's `bindings`. */
export const formInputSchema = z.object({
	id: z.string().min(1),
	label: z.string().optional(),
	description: z.string().optional(),
	type: z.enum(["string", "number", "boolean", "json"]).optional(),
	required: z.boolean().optional(),
});

const formFieldBase = z.object({
	id: z.string().min(1),
	label: z.string().optional(),
	description: z.string().optional(),
	placeholder: z.string().optional(),
	required: z.boolean().optional(),
	readonly: z.boolean().optional(),
	/** Static or template string; resolved at form await time. Prefer `{{form.*}}`. */
	default: z.unknown().optional(),
});

export const formFieldSchemaV1 = z.discriminatedUnion("type", [
	formFieldBase.extend({
		type: z.literal("string"),
	}),
	formFieldBase.extend({
		type: z.literal("number"),
	}),
	formFieldBase.extend({
		type: z.literal("boolean"),
	}),
	formFieldBase.extend({
		type: z.literal("json"),
	}),
	formFieldBase.extend({
		type: z.literal("select"),
		options: z.array(formSelectOptionSchema).optional(),
		optionsFrom: formOptionsFromSchema.optional(),
	}),
]);

export const formDefinitionSchemaV1 = z.object({
	version: z.literal(FORM_VERSION),
	id: workspaceFileIdSchema,
	name: z.string().min(1),
	description: z.string().optional(),
	/**
	 * Reusable inputs bound by each flow's form node (`bindings`).
	 * Field defaults / optionsFrom should reference `{{form.<id>}}`.
	 */
	inputs: z.array(formInputSchema).optional(),
	fields: z.array(formFieldSchemaV1).default([]),
});

export type FormSelectOption = z.infer<typeof formSelectOptionSchema>;
export type FormOptionsFrom = z.infer<typeof formOptionsFromSchema>;
export type FormInputV1 = z.infer<typeof formInputSchema>;
export type FormFieldV1 = z.infer<typeof formFieldSchemaV1>;
export type FormV1 = z.infer<typeof formDefinitionSchemaV1>;
