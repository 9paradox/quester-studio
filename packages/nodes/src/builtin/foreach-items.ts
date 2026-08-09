import jmespath from "jmespath";

export function resolveForeachItems(
	itemsExpr: string,
	input: unknown,
	resolveTemplate: (t: string) => string,
): unknown[] {
	if (itemsExpr.includes("{{")) {
		const resolved = resolveTemplate(itemsExpr);
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

	const fromPath = jmespath.search(input, itemsExpr);
	if (Array.isArray(fromPath)) return fromPath;
	throw new Error(
		`foreach items must resolve to an array (got ${typeof fromPath})`,
	);
}

export async function mapWithConcurrency<T, R>(
	items: T[],
	concurrency: number,
	fn: (item: T, index: number) => Promise<R>,
	signal?: AbortSignal,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let nextIndex = 0;

	async function worker(): Promise<void> {
		while (nextIndex < items.length) {
			if (signal?.aborted) {
				throw new DOMException("Flow run cancelled", "AbortError");
			}
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
