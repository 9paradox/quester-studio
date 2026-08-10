import { z } from "zod";
import { workspaceFileIdSchema } from "../common.js";

export const formNodeDataSchema = z.object({
	label: z.string().optional(),
	/** Workspace form id (`forms/{formId}.form.json`). */
	formId: workspaceFileIdSchema,
	/**
	 * Optional draft / prefill overrides for this node (field id → value).
	 * String values may be templates resolved at await time.
	 */
	value: z.record(z.unknown()).optional(),
});

export type FormNodeData = z.infer<typeof formNodeDataSchema>;
