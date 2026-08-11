/** Quester template token: {{ env.* | secrets.* | input.* | nodes.* | vars.* }}. */
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
	/** Nested paths under run input (for `input.<path>`). */
	inputPaths: string[];
	/** Variable names set by `set` nodes (for `vars.<key>`). */
	varKeys: string[];
	/** Keys from the selected environment file (for `env.<key>`). */
	envKeys: string[];
	/** Values from the selected environment (for hover previews). */
	envValues: Record<string, string | number | boolean>;
	/** Keys from the selected env secrets file (for `secrets.<key>`). */
	secretKeys: string[];
	/** Form input ids (`form.<id>`) from the active form / selected form node. */
	formKeys: string[];
	/** Relative paths under each node id (contracts ∪ learned). */
	nodePaths: Record<string, string[]>;
	/** JMESPath suggestions for previous-node / selected context. */
	jmesPaths: string[];
	/** Paths under previous node for Eta `it.previous.*`. */
	previousPaths: string[];
	/** Parsed run-input object (for hover). */
	inputValue: unknown;
	/** Declared `set` variable values (may still contain templates). */
	varValues: Record<string, unknown>;
	/** Last-run node outputs (for `nodes.*` hover). */
	nodeOutputs: Record<string, unknown>;
	/**
	 * Foreach body scopes available at the selected node (`item` / custom
	 * `itemVar`, plus `index`). Walks ancestor frames so nested try/foreach work.
	 */
	loopKeys: string[];
};

export const TEMPLATE_ROOTS = [
	"env",
	"secrets",
	"input",
	"nodes",
	"vars",
	"form",
] as const;

export const ETA_ROOTS = ["input", "vars", "nodes", "previous"] as const;

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
	return Object.keys(varValuesFromNodes(nodes));
}

/**
 * Foreach body template keys (`item` / custom `itemVar`, `index`) for a node
 * inside one or more framed foreach ancestors (including through nested tries).
 */
export function loopKeysForNode(
	nodes: ReadonlyArray<{
		id: string;
		type: string;
		parentId?: string;
		data?: Record<string, unknown>;
	}>,
	nodeId: string | null | undefined,
): string[] {
	if (!nodeId) return [];
	const byId = new Map(nodes.map((n) => [n.id, n]));
	const keys = new Set<string>();
	let cur = byId.get(nodeId)?.parentId;
	const seen = new Set<string>();
	while (cur && !seen.has(cur)) {
		seen.add(cur);
		const parent = byId.get(cur);
		if (!parent) break;
		if (parent.type === "foreach") {
			const raw = parent.data?.itemVar;
			const itemVar =
				typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : "item";
			keys.add(itemVar);
			keys.add("index");
			// Engine always exposes `item` alongside a custom itemVar.
			keys.add("item");
		}
		cur = parent.parentId;
	}
	return [...keys].sort();
}

/** Collect declared `set` variable values (last write wins per key). */
export function varValuesFromNodes(
	nodes: ReadonlyArray<{ type: string; data?: Record<string, unknown> }>,
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const node of nodes) {
		if (node.type !== "set") continue;
		const vars = node.data?.variables;
		if (vars && typeof vars === "object" && !Array.isArray(vars)) {
			for (const [key, value] of Object.entries(vars)) {
				out[key] = value;
			}
		}
	}
	return out;
}

/**
 * Resolve a dotted / indexed path on a JSON value (`body.user.id`, `items[0].id`).
 * Returns `undefined` when the path is missing.
 */
export function getValueAtPath(root: unknown, path: string): unknown {
	const trimmed = path.trim();
	if (!trimmed) return root;
	const segments: Array<string | number> = [];
	const re = /([^.[\]]+)|\[(\d+)\]/g;
	for (const match of trimmed.matchAll(re)) {
		if (match[1] !== undefined) segments.push(match[1]);
		else if (match[2] !== undefined) segments.push(Number(match[2]));
	}
	let cur: unknown = root;
	for (const seg of segments) {
		if (cur === null || cur === undefined) return undefined;
		if (typeof seg === "number") {
			if (!Array.isArray(cur)) return undefined;
			cur = cur[seg];
			continue;
		}
		if (typeof cur !== "object") return undefined;
		cur = (cur as Record<string, unknown>)[seg];
	}
	return cur;
}

export type TemplateHoverInfo = {
	/** Full token path without braces, e.g. `env.API_BASE`. */
	path: string;
	/** Human source label. */
	source: string;
	/** Value shown in the tooltip (secrets are never real values). */
	display: string;
	/** True when a concrete value was resolved. */
	found: boolean;
};

const HOVER_MAX_CHARS = 240;

export function formatHoverDisplay(value: unknown): string {
	if (value === undefined) return "(undefined)";
	if (value === null) return "null";
	if (typeof value === "string") {
		return value.length > HOVER_MAX_CHARS
			? `${value.slice(0, HOVER_MAX_CHARS)}…`
			: value;
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	try {
		const text = JSON.stringify(value);
		if (text === undefined) return String(value);
		return text.length > HOVER_MAX_CHARS
			? `${text.slice(0, HOVER_MAX_CHARS)}…`
			: text;
	} catch {
		return String(value);
	}
}

/**
 * Resolve hover preview for a complete template body (inside `{{ }}`).
 * Secret values are never revealed — only that the name exists.
 */
export function resolveTemplateHover(
	body: string,
	ctx: TemplateCompletionContext,
): TemplateHoverInfo | null {
	const trimmed = body.trim();
	if (!trimmed) return null;
	const dot = trimmed.indexOf(".");
	if (dot === -1) {
		if (!(TEMPLATE_ROOTS as readonly string[]).includes(trimmed)) {
			if (ctx.loopKeys.includes(trimmed)) {
				return {
					path: trimmed,
					source: "foreach",
					display: "foreach body scope",
					found: true,
				};
			}
			return null;
		}
		return {
			path: trimmed,
			source: "template source",
			display: `Use ${trimmed}.<key>`,
			found: false,
		};
	}
	const root = trimmed.slice(0, dot);
	const rest = trimmed.slice(dot + 1);
	if (!rest) return null;

	switch (root) {
		case "env": {
			if (!(rest in ctx.envValues) && !ctx.envKeys.includes(rest)) {
				return {
					path: trimmed,
					source: "environment",
					display: "(not set)",
					found: false,
				};
			}
			const value = ctx.envValues[rest];
			return {
				path: trimmed,
				source: "environment",
				display: value === undefined ? "(not set)" : formatHoverDisplay(value),
				found: value !== undefined,
			};
		}
		case "secrets": {
			const known = ctx.secretKeys.includes(rest);
			return {
				path: trimmed,
				source: "secret",
				display: known ? "(secret — value hidden)" : "(not set)",
				found: known,
			};
		}
		case "input": {
			const value = getValueAtPath(ctx.inputValue, rest);
			return {
				path: trimmed,
				source: "run input",
				display:
					value === undefined
						? "(not in run input)"
						: formatHoverDisplay(value),
				found: value !== undefined,
			};
		}
		case "vars": {
			if (!(rest in ctx.varValues)) {
				return {
					path: trimmed,
					source: "variable",
					display: "(not declared)",
					found: false,
				};
			}
			return {
				path: trimmed,
				source: "variable",
				display: formatHoverDisplay(ctx.varValues[rest]),
				found: true,
			};
		}
		case "nodes": {
			const nextDot = rest.indexOf(".");
			const nodeId = nextDot === -1 ? rest : rest.slice(0, nextDot);
			const subPath = nextDot === -1 ? "" : rest.slice(nextDot + 1);
			const output = ctx.nodeOutputs[nodeId];
			if (output === undefined) {
				return {
					path: trimmed,
					source: "node output",
					display: "(no run data yet)",
					found: false,
				};
			}
			const value = subPath ? getValueAtPath(output, subPath) : output;
			return {
				path: trimmed,
				source: "node output",
				display:
					value === undefined
						? "(path missing on last run)"
						: formatHoverDisplay(value),
				found: value !== undefined,
			};
		}
		default:
			if (ctx.loopKeys.includes(root)) {
				return {
					path: trimmed,
					source: "foreach",
					display: "foreach body scope path",
					found: true,
				};
			}
			return null;
	}
}

export type TemplateSuggestion = { label: string; detail: string };

function filterByPrefix(
	labels: readonly string[],
	prefix: string,
	detail: string,
): TemplateSuggestion[] {
	const lower = prefix.toLowerCase();
	return labels
		.filter((label) => label.toLowerCase().startsWith(lower))
		.map((label) => ({ label, detail }));
}

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
		return [
			...filterByPrefix(TEMPLATE_ROOTS, trimmed, "template source"),
			...filterByPrefix(ctx.loopKeys, trimmed, "foreach body"),
		];
	}

	const root = trimmed.slice(0, dot);
	const rest = trimmed.slice(dot + 1);

	switch (root) {
		case "nodes": {
			const nextDot = rest.indexOf(".");
			if (nextDot === -1) {
				const idPrefix = `nodes.${rest}`;
				const idHits = filterByPrefix(
					ctx.nodeIds.map((id) => `nodes.${id}`),
					idPrefix,
					"node output",
				);
				// Also suggest paths when rest already matches a full id
				if (ctx.nodeIds.includes(rest)) {
					const paths = ctx.nodePaths[rest] ?? [];
					return [
						...idHits,
						...filterByPrefix(
							paths.map((p) => `nodes.${rest}.${p}`),
							idPrefix,
							"node path",
						),
					];
				}
				return idHits;
			}
			const nodeId = rest.slice(0, nextDot);
			const pathPrefix = rest.slice(nextDot + 1);
			const paths = ctx.nodePaths[nodeId] ?? [];
			const labels = paths
				.filter((p) => p.toLowerCase().startsWith(pathPrefix.toLowerCase()))
				.map((p) => `nodes.${nodeId}.${p}`);
			return labels.map((label) => ({ label, detail: "node path" }));
		}
		case "input": {
			const paths = ctx.inputPaths.length > 0 ? ctx.inputPaths : ctx.inputKeys;
			const labels = paths
				.filter((p) => p.toLowerCase().startsWith(rest.toLowerCase()))
				.map((p) => `input.${p}`);
			return labels.map((label) => ({ label, detail: "run input" }));
		}
		case "vars":
			return filterByPrefix(
				ctx.varKeys.map((key) => `vars.${key}`),
				`vars.${rest}`,
				"variable",
			);
		case "form":
			return filterByPrefix(
				ctx.formKeys.map((key) => `form.${key}`),
				`form.${rest}`,
				"form input",
			);
		case "env":
			return filterByPrefix(
				ctx.envKeys.map((key) => `env.${key}`),
				`env.${rest}`,
				"environment",
			);
		case "secrets":
			return filterByPrefix(
				ctx.secretKeys.map((key) => `secrets.${key}`),
				`secrets.${rest}`,
				"secret",
			);
		default:
			return [];
	}
}

/** Common JMESPath constructs for autocomplete (not path lint). */
export const JMESPATH_SNIPPETS: readonly TemplateSuggestion[] = [
	{ label: "[0]", detail: "First array element" },
	{ label: "[*]", detail: "All elements (projection)" },
	{ label: "[*].id", detail: "Map id from each array item" },
	{ label: "length(@)", detail: "Array or string length" },
	{ label: "contains(@, 'text')", detail: "True when string contains text" },
	{
		label: "starts_with(@, 'prefix')",
		detail: "True when string starts with prefix",
	},
	{ label: "type(@)", detail: "JSON type name" },
	{ label: "| [0]", detail: "Pipe result, take first element" },
	{ label: "| length(@)", detail: "Pipe result, get length" },
];

/** Snippet suggestions filtered by the typed prefix. */
export function jmesPathSnippetSuggestions(word: string): TemplateSuggestion[] {
	const trimmed = word.replace(/^\s+/, "");
	if (!trimmed) return [...JMESPATH_SNIPPETS];
	const lower = trimmed.toLowerCase();
	return JMESPATH_SNIPPETS.filter(
		(s) =>
			s.label.toLowerCase().startsWith(lower) ||
			s.label.toLowerCase().includes(lower),
	);
}

/** Suggestions for bare JMESPath fields (extract / assert / json). */
export function jmesPathSuggestions(
	word: string,
	paths: readonly string[],
): TemplateSuggestion[] {
	const trimmed = word.replace(/^\s+/, "");
	const pathHits = !trimmed
		? paths.slice(0, 80).map((label) => ({
				label,
				detail: "path",
			}))
		: filterByPrefix(paths, trimmed, "path");
	const snippetHits = jmesPathSnippetSuggestions(trimmed);

	const seen = new Set<string>();
	const merged: TemplateSuggestion[] = [];
	for (const hit of [...pathHits, ...snippetHits]) {
		if (seen.has(hit.label)) continue;
		seen.add(hit.label);
		merged.push(hit);
	}
	return merged;
}

/**
 * Suggestions inside Eta `<%= %>` / `<% %>` after `it`.
 * `word` is text from `it` to cursor (e.g. "it.pre" or "it.previous.body").
 */
export function etaSuggestions(
	word: string,
	ctx: TemplateCompletionContext,
): TemplateSuggestion[] {
	const trimmed = word.replace(/^\s+/, "");
	if (!trimmed.startsWith("it")) return [];

	const afterIt = trimmed.slice(2);
	if (afterIt === "" || afterIt === ".") {
		return ETA_ROOTS.map((root) => ({
			label: `it.${root}`,
			detail: "eta context",
		}));
	}
	if (!afterIt.startsWith(".")) return [];

	const rest = afterIt.slice(1);
	const dot = rest.indexOf(".");
	if (dot === -1) {
		return filterByPrefix(
			ETA_ROOTS.map((root) => `it.${root}`),
			`it.${rest}`,
			"eta context",
		);
	}

	const root = rest.slice(0, dot);
	const pathPrefix = rest.slice(dot + 1);

	switch (root) {
		case "input": {
			const paths = ctx.inputPaths.length > 0 ? ctx.inputPaths : ctx.inputKeys;
			return paths
				.filter((p) => p.toLowerCase().startsWith(pathPrefix.toLowerCase()))
				.map((p) => ({
					label: `it.input.${p}`,
					detail: "eta input",
				}));
		}
		case "vars":
			return filterByPrefix(
				ctx.varKeys.map((k) => `it.vars.${k}`),
				`it.vars.${pathPrefix}`,
				"eta vars",
			);
		case "nodes": {
			const nextDot = pathPrefix.indexOf(".");
			if (nextDot === -1) {
				return filterByPrefix(
					ctx.nodeIds.map((id) => `it.nodes.${id}`),
					`it.nodes.${pathPrefix}`,
					"eta node",
				);
			}
			const nodeId = pathPrefix.slice(0, nextDot);
			const sub = pathPrefix.slice(nextDot + 1);
			const paths = ctx.nodePaths[nodeId] ?? [];
			return paths
				.filter((p) => p.toLowerCase().startsWith(sub.toLowerCase()))
				.map((p) => ({
					label: `it.nodes.${nodeId}.${p}`,
					detail: "eta node path",
				}));
		}
		case "previous":
			return (ctx.previousPaths.length > 0 ? ctx.previousPaths : ctx.jmesPaths)
				.filter((p) => p.toLowerCase().startsWith(pathPrefix.toLowerCase()))
				.map((p) => ({
					label: `it.previous.${p}`,
					detail: "eta previous",
				}));
		default:
			return [];
	}
}

export type PathLintStatus = "known" | "unknown" | "skip";

/**
 * Classify a complete template token body (inside `{{ }}`, trimmed).
 * Secrets are checked by name only.
 */
export function classifyTemplatePath(
	body: string,
	ctx: TemplateCompletionContext,
): PathLintStatus {
	const trimmed = body.trim();
	if (!trimmed || trimmed.includes("{{") || trimmed.includes("}}")) {
		return "skip";
	}
	const dot = trimmed.indexOf(".");
	if (dot === -1) {
		if ((TEMPLATE_ROOTS as readonly string[]).includes(trimmed)) {
			return "known";
		}
		return ctx.loopKeys.includes(trimmed) ? "known" : "unknown";
	}
	const root = trimmed.slice(0, dot);
	const rest = trimmed.slice(dot + 1);
	if (!rest) return "skip";

	switch (root) {
		case "env":
			return ctx.envKeys.includes(rest) ? "known" : "unknown";
		case "secrets":
			return ctx.secretKeys.includes(rest) ? "known" : "unknown";
		case "vars":
			return ctx.varKeys.includes(rest) ? "known" : "unknown";
		case "form":
			if (ctx.formKeys.length === 0) return "skip";
			return ctx.formKeys.includes(rest) ? "known" : "unknown";
		case "input": {
			if (ctx.inputKeys.includes(rest) || ctx.inputPaths.includes(rest)) {
				return "known";
			}
			// Prefix of a known nested path is ok while authoring deeper
			if (
				ctx.inputPaths.some(
					(p) =>
						p === rest || p.startsWith(`${rest}.`) || p.startsWith(`${rest}[`),
				)
			) {
				return "known";
			}
			return ctx.inputPaths.length === 0 && ctx.inputKeys.length === 0
				? "skip"
				: "unknown";
		}
		case "nodes": {
			const nextDot = rest.indexOf(".");
			if (nextDot === -1) {
				return ctx.nodeIds.includes(rest) ? "known" : "unknown";
			}
			const nodeId = rest.slice(0, nextDot);
			const path = rest.slice(nextDot + 1);
			if (!ctx.nodeIds.includes(nodeId)) return "unknown";
			const paths = ctx.nodePaths[nodeId] ?? [];
			if (paths.length === 0) return "skip";
			if (paths.includes(path)) return "known";
			if (
				paths.some(
					(p) =>
						p === path || p.startsWith(`${path}.`) || p.startsWith(`${path}[`),
				)
			) {
				return "known";
			}
			return "unknown";
		}
		default:
			// Foreach body: `{{item.foo}}` — accept nested paths under itemVar/index
			return ctx.loopKeys.includes(root) ? "known" : "unknown";
	}
}

/** Classify a JMESPath expression against known paths. */
export function classifyJmesPath(
	expr: string,
	paths: readonly string[],
): PathLintStatus {
	const trimmed = expr.trim();
	if (!trimmed) return "skip";
	// Skip complex JMESPath (pipes, filters, functions)
	if (/[|?*@()]/.test(trimmed)) return "skip";
	if (paths.length === 0) return "skip";
	if (paths.includes(trimmed)) return "known";
	if (
		paths.some(
			(p) =>
				p === trimmed ||
				p.startsWith(`${trimmed}.`) ||
				p.startsWith(`${trimmed}[`),
		)
	) {
		return "known";
	}
	return "unknown";
}
