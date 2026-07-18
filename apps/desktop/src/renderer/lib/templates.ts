/** Quester template token: {{ env.* | input.* | nodes.* | vars.* | ... }}. */
export const TEMPLATE_RE = /\{\{[^{}]*\}\}/g;

export type TemplateRange = { from: number; to: number };

/** Byte offsets of every `{{...}}` token in the text (for editor decoration). */
export function findTemplateRanges(text: string): TemplateRange[] {
	const ranges: TemplateRange[] = [];
	for (const match of text.matchAll(TEMPLATE_RE)) {
		const from = match.index ?? 0;
		ranges.push({ from, to: from + match[0].length });
	}
	return ranges;
}

export type TemplateCompletionContext = {
	/** Node ids in the active flow (for `nodes.<id>`). */
	nodeIds: string[];
	/** Top-level keys of the run input JSON (for `input.<key>`). */
	inputKeys: string[];
	/** Variable names set by `set` nodes (for `vars.<key>`). */
	varKeys: string[];
};

export const TEMPLATE_ROOTS = ["env", "input", "nodes", "vars"] as const;

/** Parse top-level object keys from run-input JSON text; empty on failure. */
export function inputKeysFromJson(inputJson: string): string[] {
	try {
		const parsed = JSON.parse(inputJson) as unknown;
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return Object.keys(parsed);
		}
	} catch {
		/* ignore invalid draft */
	}
	return [];
}

/** Collect `{{vars.*}}` keys declared by `set` nodes in the flow. */
export function varKeysFromNodes(
	nodes: ReadonlyArray<{ type: string; data?: Record<string, unknown> }>,
): string[] {
	const keys = new Set<string>();
	for (const node of nodes) {
		if (node.type !== "set") continue;
		const vars = node.data?.variables;
		if (vars && typeof vars === "object" && !Array.isArray(vars)) {
			for (const key of Object.keys(vars)) keys.add(key);
		}
	}
	return [...keys];
}

export type TemplateSuggestion = { label: string; detail: string };

/**
 * Suggestions for the identifier being typed inside `{{ }}`.
 * `word` is the raw text between `{{` and the cursor (e.g. "nodes.lo").
 */
export function templateSuggestions(
	word: string,
	ctx: TemplateCompletionContext,
): TemplateSuggestion[] {
	const trimmed = word.replace(/^\s+/, "");
	const dot = trimmed.indexOf(".");

	if (dot === -1) {
		return TEMPLATE_ROOTS.map((root) => ({
			label: root,
			detail: "template source",
		}));
	}

	const root = trimmed.slice(0, dot);
	switch (root) {
		case "nodes":
			return ctx.nodeIds.map((id) => ({
				label: `nodes.${id}`,
				detail: "node output",
			}));
		case "input":
			return ctx.inputKeys.map((key) => ({
				label: `input.${key}`,
				detail: "run input",
			}));
		case "vars":
			return ctx.varKeys.map((key) => ({
				label: `vars.${key}`,
				detail: "variable",
			}));
		default:
			return [];
	}
}
