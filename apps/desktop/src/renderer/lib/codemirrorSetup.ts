import {
	type Completion,
	type CompletionContext,
	type CompletionResult,
	autocompletion,
} from "@codemirror/autocomplete";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { type Diagnostic, linter } from "@codemirror/lint";
import {
	EditorState,
	type Extension,
	RangeSetBuilder,
} from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	EditorView,
	type PluginValue,
	ViewPlugin,
	type ViewUpdate,
	hoverTooltip,
} from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import {
	type TemplateCompletionContext,
	classifyJmesPath,
	classifyTemplatePath,
	etaSuggestions,
	findTemplateRanges,
	jmesPathSuggestions,
	resolveTemplateHover,
	templateSuggestions,
} from "./templates.js";

/** Editor chrome themed with Quester CSS variables (light + dark via tokens). */
export const questerEditorTheme = EditorView.theme({
	"&": {
		fontSize: "12px",
		backgroundColor: "transparent",
		color: "var(--foreground)",
	},
	"&.cm-focused": { outline: "none" },
	".cm-scroller": {
		fontFamily: "var(--font-mono, ui-monospace, monospace)",
		lineHeight: "1.45",
	},
	".cm-content": { padding: "0", caretColor: "var(--foreground)" },
	".cm-line": { padding: "0 2px" },
	".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--foreground)" },
	".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
		backgroundColor: "color-mix(in oklch, var(--primary) 25%, transparent)",
	},
	".cm-activeLine": { backgroundColor: "transparent" },
	".cm-gutters": {
		backgroundColor: "transparent",
		color: "var(--muted-foreground)",
		border: "none",
	},
	".cm-template": {
		color: "var(--sidebar-primary)",
		backgroundColor:
			"color-mix(in oklch, var(--sidebar-primary) 18%, transparent)",
		borderRadius: "2px",
		fontWeight: "600",
	},
	".cm-lintRange-error": {
		textDecoration: "underline wavy var(--destructive)",
	},
	".cm-lintRange-warning": {
		textDecoration:
			"underline wavy color-mix(in oklch, var(--muted-foreground) 80%, var(--primary))",
	},
	".cm-tooltip": {
		backgroundColor: "var(--popover)",
		color: "var(--popover-foreground)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius-sm, 6px)",
		boxShadow: "var(--shadow, 0 4px 12px rgb(0 0 0 / 0.15))",
	},
	".cm-tooltip.cm-tooltip-autocomplete > ul": {
		fontFamily: "var(--font-mono, ui-monospace, monospace)",
		fontSize: "12px",
		maxHeight: "12rem",
	},
	".cm-tooltip-autocomplete ul li[aria-selected]": {
		backgroundColor: "var(--accent)",
		color: "var(--accent-foreground)",
	},
	".cm-completionDetail": {
		color: "var(--muted-foreground)",
		fontStyle: "normal",
		marginLeft: "0.75rem",
	},
	".cm-placeholder": { color: "var(--muted-foreground)" },
	".cm-tooltip.cm-tooltip-hover": {
		padding: "0.35rem 0.5rem",
		fontFamily: "var(--font-mono, ui-monospace, monospace)",
		fontSize: "11px",
		maxWidth: "20rem",
		lineHeight: "1.4",
	},
	".cm-template-hover-path": {
		color: "var(--muted-foreground)",
		marginBottom: "0.15rem",
	},
	".cm-template-hover-value": {
		color: "var(--foreground)",
		wordBreak: "break-all",
		whiteSpace: "pre-wrap",
	},
});

/** Token colors mapped to theme tokens (JSON / XML / HTML). */
export const questerHighlightStyle = HighlightStyle.define([
	{ tag: t.string, color: "var(--syntax-string)" },
	{ tag: [t.number, t.bool, t.null], color: "var(--syntax-number)" },
	{
		tag: [t.propertyName, t.attributeName],
		color: "var(--syntax-key)",
		fontWeight: "500",
	},
	{ tag: [t.tagName, t.typeName], color: "var(--syntax-tag)" },
	{ tag: t.attributeValue, color: "var(--syntax-string)" },
	{ tag: t.comment, color: "var(--muted-foreground)", fontStyle: "italic" },
	{
		tag: [t.punctuation, t.separator, t.brace, t.squareBracket, t.angleBracket],
		color: "var(--muted-foreground)",
	},
]);

const templateMark = Decoration.mark({ class: "cm-template" });

function buildTemplateDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	for (const { from, to } of view.visibleRanges) {
		const text = view.state.doc.sliceString(from, to);
		for (const range of findTemplateRanges(text)) {
			builder.add(from + range.from, from + range.to, templateMark);
		}
	}
	return builder.finish();
}

/** Highlights `{{...}}` template tokens anywhere in the document. */
export const templateHighlighter = ViewPlugin.fromClass(
	class implements PluginValue {
		decorations: DecorationSet;
		constructor(view: EditorView) {
			this.decorations = buildTemplateDecorations(view);
		}
		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = buildTemplateDecorations(update.view);
			}
		}
	},
	{ decorations: (plugin) => plugin.decorations },
);

function toCompletionOptions(
	suggestions: { label: string; detail: string }[],
): Completion[] {
	return suggestions.map((s) => ({
		label: s.label,
		detail: s.detail,
		type: "variable",
	}));
}

/**
 * Autocomplete for identifiers typed inside `{{ }}`. Reads the completion
 * context lazily so extensions stay stable across live flow edits.
 */
export function templateCompletion(
	getContext: () => TemplateCompletionContext,
): Extension {
	const source = (context: CompletionContext): CompletionResult | null => {
		const before = context.state.doc.sliceString(0, context.pos);
		const open = before.lastIndexOf("{{");
		if (open === -1) return null;
		const word = before.slice(open + 2);
		if (word.includes("}}")) return null;

		const suggestions = templateSuggestions(word, getContext());
		if (suggestions.length === 0) return null;

		const leading = word.length - word.replace(/^\s+/, "").length;
		return {
			from: open + 2 + leading,
			options: toCompletionOptions(suggestions),
			validFor: /^[\w.[\]"']*$/,
		};
	};
	return autocompletion({ override: [source], icons: false });
}

/** Prefix completion from a static suggestion list (e.g. HTTP header names). */
export function staticCompletion(
	getSuggestions: (word: string) => { label: string; detail: string }[],
): Extension {
	const source = (context: CompletionContext): CompletionResult | null => {
		const line = context.state.doc.lineAt(context.pos);
		const word = line.text.slice(0, context.pos - line.from);
		const suggestions = getSuggestions(word);
		if (suggestions.length === 0) return null;
		return {
			from: line.from,
			options: toCompletionOptions(suggestions),
			validFor: /^[\w\-./+ ;=*]*$/,
		};
	};
	return autocompletion({ override: [source], icons: false });
}

/**
 * Prefer `{{…}}` template completion when inside braces; otherwise use static
 * suggestions (e.g. common header values).
 */
export function templateOrStaticCompletion(
	getContext: () => TemplateCompletionContext,
	getStatic: (word: string) => { label: string; detail: string }[],
): Extension {
	const source = (context: CompletionContext): CompletionResult | null => {
		const before = context.state.doc.sliceString(0, context.pos);
		const open = before.lastIndexOf("{{");
		if (open !== -1) {
			const word = before.slice(open + 2);
			if (!word.includes("}}")) {
				const suggestions = templateSuggestions(word, getContext());
				if (suggestions.length > 0) {
					const leading = word.length - word.replace(/^\s+/, "").length;
					return {
						from: open + 2 + leading,
						options: toCompletionOptions(suggestions),
						validFor: /^[\w.[\]"']*$/,
					};
				}
			}
		}

		const line = context.state.doc.lineAt(context.pos);
		const word = line.text.slice(0, context.pos - line.from);
		const suggestions = getStatic(word);
		if (suggestions.length === 0) return null;
		return {
			from: line.from,
			options: toCompletionOptions(suggestions),
			validFor: /^[\w\-./+ ;=*{}]*$/,
		};
	};
	return autocompletion({ override: [source], icons: false });
}

/** Always-on JMESPath path completion. */
export function jmesPathCompletion(getPaths: () => string[]): Extension {
	const source = (context: CompletionContext): CompletionResult | null => {
		const line = context.state.doc.lineAt(context.pos);
		const word = line.text.slice(0, context.pos - line.from);
		const suggestions = jmesPathSuggestions(word, getPaths());
		if (suggestions.length === 0) return null;
		return {
			from: line.from,
			options: toCompletionOptions(suggestions),
			validFor: /^[\w.[\]"']*$/,
		};
	};
	return autocompletion({ override: [source], icons: false });
}

/**
 * Eta `it.*` completion inside `<%= %>` / `<% %>`, combined with template
 * completion via a single override source.
 */
export function templateAndEtaCompletion(
	getContext: () => TemplateCompletionContext,
): Extension {
	const source = (context: CompletionContext): CompletionResult | null => {
		const before = context.state.doc.sliceString(0, context.pos);
		const after = context.state.doc.sliceString(context.pos);

		// Prefer open {{ }} template token
		const openTpl = before.lastIndexOf("{{");
		if (openTpl !== -1) {
			const word = before.slice(openTpl + 2);
			if (!word.includes("}}")) {
				const suggestions = templateSuggestions(word, getContext());
				if (suggestions.length > 0) {
					const leading = word.length - word.replace(/^\s+/, "").length;
					return {
						from: openTpl + 2 + leading,
						options: toCompletionOptions(suggestions),
						validFor: /^[\w.[\]"']*$/,
					};
				}
			}
		}

		// Eta tag: find last <% or <%= before cursor, ensure %> not closed
		const openEtaAssign = before.lastIndexOf("<%=");
		const openEta = before.lastIndexOf("<%");
		const open =
			openEtaAssign >= openEta ? openEtaAssign : openEta >= 0 ? openEta : -1;
		if (open === -1) return null;
		const tagStart = before.slice(open).startsWith("<%=") ? open + 3 : open + 2;
		const inside = before.slice(tagStart);
		if (inside.includes("%>")) return null;
		// Also require closing %> somewhere after cursor or allow incomplete
		if (after.includes("%>") === false && !context.explicit) {
			// still allow if cursor is mid-tag
		}

		const itIdx = inside.lastIndexOf("it");
		if (itIdx === -1) {
			if (context.explicit || /\bit$/.test(inside) || inside.trim() === "") {
				const suggestions = etaSuggestions("it", getContext());
				return {
					from: context.pos,
					options: toCompletionOptions(suggestions),
					validFor: /^[\w.]*$/,
				};
			}
			return null;
		}
		const word = inside.slice(itIdx);
		if (/[^.\w]/.test(word.slice(2))) return null;
		const suggestions = etaSuggestions(word, getContext());
		if (suggestions.length === 0) return null;
		return {
			from: tagStart + itIdx,
			options: toCompletionOptions(suggestions),
			validFor: /^[\w.]*$/,
		};
	};
	return autocompletion({ override: [source], icons: false });
}

/** Hover preview for complete `{{…}}` tokens (env shows value; secrets stay masked). */
export function templateHoverTooltip(
	getContext: () => TemplateCompletionContext,
): Extension {
	return hoverTooltip((view, pos) => {
		const text = view.state.doc.toString();
		for (const range of findTemplateRanges(text)) {
			if (pos < range.from || pos > range.to) continue;
			const token = text.slice(range.from, range.to);
			const body = token.slice(2, -2);
			const info = resolveTemplateHover(body, getContext());
			if (!info) return null;
			return {
				pos: range.from,
				end: range.to,
				above: true,
				create: () => {
					const dom = document.createElement("div");
					const pathEl = document.createElement("div");
					pathEl.className = "cm-template-hover-path";
					pathEl.textContent = `${info.source} · ${info.path}`;
					const valueEl = document.createElement("div");
					valueEl.className = "cm-template-hover-value";
					valueEl.textContent = info.display;
					dom.append(pathEl, valueEl);
					return { dom };
				},
			};
		}
		return null;
	});
}

/** Warn-only lint for unknown template paths. */
export function templatePathLinter(
	getContext: () => TemplateCompletionContext,
): Extension {
	return linter((view) => {
		const text = view.state.doc.toString();
		const ctx = getContext();
		const diagnostics: Diagnostic[] = [];
		for (const range of findTemplateRanges(text)) {
			const token = text.slice(range.from, range.to);
			const body = token.slice(2, -2);
			const status = classifyTemplatePath(body, ctx);
			if (status === "unknown") {
				diagnostics.push({
					from: range.from,
					to: range.to,
					severity: "warning",
					message: "Unknown path — not seen in last run, env, or node contract",
				});
			}
		}
		return diagnostics;
	});
}

/** Warn-only lint for unknown JMESPath against known paths. */
export function jmesPathLinter(getPaths: () => string[]): Extension {
	return linter((view) => {
		const text = view.state.doc.toString().trim();
		const status = classifyJmesPath(text, getPaths());
		if (status !== "unknown") return [];
		return [
			{
				from: 0,
				to: view.state.doc.length,
				severity: "warning",
				message: "Unknown path — not seen in last run or node contract",
			},
		];
	});
}

/** Collapses newlines to keep an editor visually single-line. */
export const singleLineExtension: Extension = [
	EditorState.transactionFilter.of((tr) =>
		tr.docChanged && tr.newDoc.lines > 1 ? [] : tr,
	),
	EditorView.theme({ ".cm-scroller": { overflowX: "auto" } }),
];

export const themeExtensions: Extension = [
	questerEditorTheme,
	syntaxHighlighting(questerHighlightStyle),
	templateHighlighter,
];
