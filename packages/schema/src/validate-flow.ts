import { type FlowV1, flowSchemaV1, validateNodeData } from "./flow.js";
import { validateFlowGraph } from "./graph-validation.js";
import type { ValidationResult } from "./validation-types.js";

export function validateFlow(input: unknown): ValidationResult<FlowV1> {
	const parsed = flowSchemaV1.safeParse(input);
	if (!parsed.success) {
		return { success: false, error: parsed.error.message };
	}

	const flow = parsed.data;
	const nodeIssues: { path: string; message: string }[] = [];
	for (const node of flow.nodes) {
		const dataResult = validateNodeData(node.type, node.data);
		if (!dataResult.success) {
			nodeIssues.push({
				path: `nodes/${node.id}/data`,
				message: dataResult.error.message,
			});
		}
	}

	const graph = validateFlowGraph(flow);
	const issues = [...nodeIssues, ...graph.issues];
	if (issues.length > 0) {
		return {
			success: false,
			error: "Flow validation failed",
			issues,
		};
	}

	return { success: true, data: flow };
}
