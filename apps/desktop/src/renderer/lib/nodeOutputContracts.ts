import type { BuiltinNodeType } from "@quester-studio/schema";

/**
 * Static output path contracts for builtin nodes — available before any run.
 * Paths are relative (for JMESPath / `{{nodes.id.…}}` suffixes).
 */
export const NODE_OUTPUT_CONTRACTS: Record<BuiltinNodeType, readonly string[]> =
	{
		start: [],
		input: [],
		http: [
			"status",
			"statusText",
			"headers",
			"body",
			"text",
			"request",
			"request.method",
			"request.url",
			"request.headers",
			"request.body",
			"timing",
			"timing.startedAt",
			"timing.endedAt",
			"timing.durationMs",
			"size",
		],
		extract: [],
		template: [],
		set: [],
		if: ["condition"],
		output: [],
		assert: ["ok", "failures"],
		transform: [],
		merge: [],
		join: [],
		json: [],
		note: [],
		delay: [],
		switch: ["matched"],
		foreach: ["results", "count", "truncated"],
		try: ["ok", "input"],
		subflow: [],
		log: ["logged"],
		inspect: [],
	};

export function contractPathsForType(type: string): string[] {
	if (type in NODE_OUTPUT_CONTRACTS) {
		return [...NODE_OUTPUT_CONTRACTS[type as BuiltinNodeType]];
	}
	return [];
}

/** Merge contract paths with learned paths (deduped, contracts first). */
export function mergeContractAndLearned(
	contract: readonly string[],
	learned: readonly string[],
): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const p of [...contract, ...learned]) {
		if (!p || seen.has(p)) continue;
		seen.add(p);
		out.push(p);
	}
	return out;
}
