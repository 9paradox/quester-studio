import { delayNodeDataSchema } from "@quester-studio/schema";
import type { FlowNodePlugin, NodeExecutionContext } from "../types.js";

function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) {
		throw new DOMException("Flow run cancelled", "AbortError");
	}
}

function sleepMs(ms: number, signal?: AbortSignal): Promise<void> {
	throwIfAborted(signal);
	if (ms <= 0) return Promise.resolve();
	return new Promise((resolve, reject) => {
		const onAbort = () => {
			clearTimeout(timer);
			reject(new DOMException("Flow run cancelled", "AbortError"));
		};
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		if (signal) {
			signal.addEventListener("abort", onAbort, { once: true });
		}
	});
}

export async function executeDelay(ctx: NodeExecutionContext) {
	const data = delayNodeDataSchema.parse(ctx.node.data);
	const jitter = data.jitterMs ?? 0;
	const extra = jitter > 0 ? Math.floor(Math.random() * (jitter + 1)) : 0;
	await sleepMs(data.ms + extra, ctx.signal);
	return { output: ctx.input };
}

export const delayPlugin: FlowNodePlugin = {
	type: "delay",
	execute: executeDelay,
};
