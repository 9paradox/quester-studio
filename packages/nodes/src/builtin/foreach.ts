import { foreachNodeDataSchema } from "@quester-studio/schema";
import jmespath from "jmespath";
import type { FlowNodePlugin, NodeExecutionContext } from "../types.js";

function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) {
		throw new DOMException("Flow run cancelled", "AbortError");
	}
}

function resolveItemsArray(
	itemsExpr: string,
	ctx: NodeExecutionContext,
): unknown[] {
	if (itemsExpr.includes("{{")) {
		const resolved = ctx.resolveTemplate(itemsExpr);
		try {
			const parsed = JSON.parse(resolved) as unknown;
			if (Array.isArray(parsed)) return parsed;
		} catch {
			// fall through
		}
		throw new Error(
			"foreach items template must resolve to a JSON array string",
		);
	}

	const fromPath = jmespath.search(ctx.input, itemsExpr);
	if (Array.isArray(fromPath)) return fromPath;
	throw new Error(
		`foreach items must resolve to an array (got ${typeof fromPath})`,
	);
}

async function mapWithConcurrency<T, R>(
	items: T[],
	concurrency: number,
	fn: (item: T, index: number) => Promise<R>,
	signal?: AbortSignal,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let nextIndex = 0;

	async function worker(): Promise<void> {
		while (nextIndex < items.length) {
			throwIfAborted(signal);
			const index = nextIndex;
			nextIndex += 1;
			results[index] = await fn(items[index] as T, index);
		}
	}

	const workers = Array.from(
		{ length: Math.min(concurrency, items.length) },
		() => worker(),
	);
	await Promise.all(workers);
	return results;
}

export const foreachPlugin: FlowNodePlugin = {
	type: "foreach",
	async execute(ctx) {
		const data = foreachNodeDataSchema.parse(ctx.node.data);
		const rawItems = resolveItemsArray(data.items, ctx);
		const capped = rawItems.slice(0, data.maxItems);
		const itemVar = data.itemVar ?? "item";

		const mapItem = async (item: unknown, index: number): Promise<unknown> => {
			throwIfAborted(ctx.signal);
			if (data.map === undefined) return item;
			const scope = { [itemVar]: item, index };
			return jmespath.search(scope, data.map);
		};

		const concurrency = data.concurrency ?? 1;
		const results =
			concurrency <= 1
				? await (async () => {
						const mapped: unknown[] = [];
						for (let i = 0; i < capped.length; i += 1) {
							throwIfAborted(ctx.signal);
							mapped.push(await mapItem(capped[i], i));
						}
						return mapped;
					})()
				: await mapWithConcurrency(capped, concurrency, mapItem, ctx.signal);

		return {
			output: {
				results,
				count: results.length,
				truncated: rawItems.length > data.maxItems,
			},
		};
	},
};
