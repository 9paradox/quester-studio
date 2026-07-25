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
};

export const TEMPLATE_ROOTS = [
	"env",
	"secrets",
	"input",
	"nodes",
	"vars",
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
		if (!(TEMPLATE_ROOTS as readonly string[]).includes(trimmed)) return null;
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
		return filterByPrefix(TEMPLATE_ROOTS, trimmed, "template source");
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

/** Suggestions for bare JMESPath fields (extract / assert / json). */
export function jmesPathSuggestions(
	word: string,
	paths: readonly string[],
): TemplateSuggestion[] {
	const trimmed = word.replace(/^\s+/, "");
	if (!trimmed) {
		return paths.slice(0, 80).map((label) => ({
			label,
			detail: "path",
		}));
	}
	return filterByPrefix(paths, trimmed, "path");
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
		return (TEMPLATE_ROOTS as readonly string[]).includes(trimmed)
			? "known"
			: "unknown";
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
			return "unknown";
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
