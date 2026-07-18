import type { FlowNodeV1 } from "@quester/schema";
import type { ExecuteFlowRpcResult } from "../../../shared/rpc.js";
import type { StepView } from "./types.js";

export function resolveSelectedStep(
	runResult: ExecuteFlowRpcResult,
	selectedNodeId: string | null,
	selectedNode: FlowNodeV1 | null,
): { selected: StepView | null } {
	const steps: StepView[] =
		runResult.steps?.length > 0
			? runResult.steps
			: Object.keys(runResult.nodeOutputs ?? {}).map((nodeId) => ({
					nodeId,
					type: "node",
					input: runResult.nodeInputs?.[nodeId],
					output: runResult.nodeOutputs[nodeId],
				}));

	if (!selectedNodeId) return { selected: null };

	const fromSteps = steps.find((s) => s.nodeId === selectedNodeId);
	if (fromSteps) {
		return {
			selected: {
				...fromSteps,
				type: selectedNode?.type ?? fromSteps.type,
			},
		};
	}

	const input = runResult.nodeInputs?.[selectedNodeId];
	const output = runResult.nodeOutputs?.[selectedNodeId];
	if (input !== undefined || output !== undefined) {
		return {
			selected: {
				nodeId: selectedNodeId,
				type: selectedNode?.type ?? "node",
				input,
				output,
				error:
					runResult.failedNodeId === selectedNodeId
						? runResult.error
						: undefined,
			},
		};
	}

	return { selected: null };
}
