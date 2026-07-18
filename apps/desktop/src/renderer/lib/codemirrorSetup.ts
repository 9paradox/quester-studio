import {
	type Completion,
	type CompletionContext,
	type CompletionResult,
	autocompletion,
} from "@codemirror/autocomplete";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
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
} from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import {
	type TemplateCompletionContext,
	findTemplateRanges,
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
		const options: Completion[] = suggestions.map((s) => ({
			label: s.label,
			detail: s.detail,
			type: "variable",
		}));
		return {
			from: open + 2 + leading,
			options,
			validFor: /^[\w.[\]"']*$/,
		};
	};
	return autocompletion({ override: [source], icons: false });
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
