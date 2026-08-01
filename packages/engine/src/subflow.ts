import type { FlowV1 } from "@quester-studio/schema";
import { validateFlow } from "@quester-studio/schema";
import { type ExecuteFlowOptions, executeFlow } from "./execute.js";

export const SUBFLOW_MAX_DEPTH = 5;

export type SubflowResolver = {
	getFlow: (flowId: string) => FlowV1 | undefined;
};

export function createExecuteSubflow(
	resolver: SubflowResolver,
	runOptions: Omit<ExecuteFlowOptions, "executeSubflow" | "input">,
	rootFlowId: string,
): (flowId: string, input: unknown) => Promise<unknown> {
	const stack = [rootFlowId];

	const executeSubflow = async (
		targetFlowId: string,
		input: unknown,
	): Promise<unknown> => {
		if (stack.includes(targetFlowId)) {
			throw new Error(
				`Subflow cycle detected: ${[...stack, targetFlowId].join(" → ")}`,
			);
		}
		if (stack.length >= SUBFLOW_MAX_DEPTH) {
			throw new Error(`Subflow max depth (${SUBFLOW_MAX_DEPTH}) exceeded`);
		}
		const flow = resolver.getFlow(targetFlowId);
		if (!flow) throw new Error(`Subflow not found: ${targetFlowId}`);
		const validated = validateFlow(flow);
		if (!validated.success) throw new Error(validated.error);

		stack.push(targetFlowId);
		try {
			const result = await executeFlow(validated.data, {
				...runOptions,
				input,
				executeSubflow,
			});
			return result.output;
		} finally {
			stack.pop();
		}
	};

	return executeSubflow;
}
