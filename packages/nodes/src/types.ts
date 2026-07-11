import type { FlowNodeV1 } from "@quester/schema";

export type NodeExecutionContext = {
	node: FlowNodeV1;
	input: unknown;
	flowInput: unknown;
	vars: Record<string, unknown>;
	nodeOutputs: Record<string, unknown>;
	resolveTemplate: (template: string) => string;
	fetch: typeof fetch;
};

export type NodeExecutionResult = {
	output: unknown;
	branch?: "true" | "false";
	vars?: Record<string, unknown>;
};

export interface FlowNodePlugin {
	type: string;
	execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult>;
}
