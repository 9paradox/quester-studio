import { delayNodeDataSchema } from "@quester-studio/schema";
import type { FlowNodePlugin, NodeExecutionContext } from "../types.js";

function sleepMs(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeDelay(ctx: NodeExecutionContext) {
	const data = delayNodeDataSchema.parse(ctx.node.data);
	const jitter = data.jitterMs ?? 0;
	const extra = jitter > 0 ? Math.floor(Math.random() * (jitter + 1)) : 0;
	await sleepMs(data.ms + extra);
	return { output: ctx.input };
}

export const delayPlugin: FlowNodePlugin = {
	type: "delay",
	execute: executeDelay,
};
