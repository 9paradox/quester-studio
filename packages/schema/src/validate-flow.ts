import { type FlowV1, flowSchemaV1, validateNodeData } from "./flow.js";
import {
	type FlowValidationIssue,
	validateFlowGraph,
} from "./graph-validation.js";
import type { ValidationResult } from "./validation-types.js";

export function formatFlowValidationError(
	issues: ReadonlyArray<FlowValidationIssue>,
): string {
	if (issues.length === 0) return "Flow validation failed";
	const detail = issues
		.map((i) => (i.suggestion ? `${i.message} — ${i.suggestion}` : i.message))
		.join("; ");
	return `Flow validation failed: ${detail}`;
}

export function validateFlow(input: unknown): ValidationResult<FlowV1> {
	const parsed = flowSchemaV1.safeParse(input);
	if (!parsed.success) {
		return { success: false, error: parsed.error.message };
	}

	const flow = parsed.data;
	const nodeIssues: FlowValidationIssue[] = [];
	for (const node of flow.nodes) {
		const dataResult = validateNodeData(node.type, node.data);
		if (!dataResult.success) {
			nodeIssues.push({
				path: `nodes/${node.id}/data`,
				message: `${node.type} node "${node.id}": ${dataResult.error.message}`,
				suggestion: `Select ${node.id} in the inspector and fix the invalid fields`,
			});
		}
	}

	const graph = validateFlowGraph(flow);
	const issues = [...nodeIssues, ...graph.issues];
	if (issues.length > 0) {
		return {
			success: false,
			error: formatFlowValidationError(issues),
			issues,
		};
	}

	return { success: true, data: flow };
}
