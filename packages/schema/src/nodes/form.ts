import { z } from "zod";
import { workspaceFileIdSchema } from "../common.js";

export const formNodeDataSchema = z.object({
	label: z.string().optional(),
	/** Workspace form id (`forms/{formId}.form.json`). */
	formId: workspaceFileIdSchema,
	/**
	 * Map form input ids → values/templates for this flow.
	 * Resolved before field defaults; available as `{{form.*}}`.
	 */
	bindings: z.record(z.unknown()).optional(),
	/**
	 * Optional draft / prefill overrides for this node (field id → value).
	 * String values may be templates resolved at await time.
	 */
	value: z.record(z.unknown()).optional(),
});

export type FormNodeData = z.infer<typeof formNodeDataSchema>;
