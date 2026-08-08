import {
	jmesPathCompletion,
	jmesPathLinter,
	singleLineExtension,
	staticCompletion,
	templateAndEtaCompletion,
	templateCompletion,
	templateHoverTooltip,
	templateOrStaticCompletion,
	templatePathLinter,
	themeExtensions,
} from "@/lib/codemirrorSetup.js";
import {
	headerNameSuggestions,
	headerValueSuggestions,
} from "@/lib/httpHeaders.js";
import { cn } from "@/lib/utils.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import { selectTemplateContext } from "@/stores/selectors.js";
import { html } from "@codemirror/lang-html";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { linter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import CodeMirror, {
	type BasicSetupOptions,
	type Extension,
} from "@uiw/react-codemirror";
import { useEffect, useMemo, useRef } from "react";

export type CodeEditorLanguage = "json" | "xml" | "html" | "text";

export type CodeEditorCompletionMode =
	| "template"
	| "jmespath"
	| "template+eta"
	| "header-key"
	| "header-value"
	| "none";

export type CodeEditorVariant = "compact" | "document";

type CodeEditorProps = {
	value: string;
	onChange?: (value: string) => void;
	onBlur?: () => void;
	placeholder?: string;
	/** Syntax highlighting mode. */
	language?: CodeEditorLanguage;
	/** Underline invalid JSON. Defaults to true for `json`. */
	lint?: boolean;
	/** Pretty-print on blur when the value is valid JSON (no-op otherwise). */
	formatOnBlur?: boolean;
	/** Collapse to one visual line (blocks newlines) — for URLs, expressions. */
	singleLine?: boolean;
	/**
	 * `compact` — dense fields (default). `document` — fold, line numbers, search
	 * for large JSON bodies / response Raw (plan 03 can swap virtualize later).
	 */
	variant?: CodeEditorVariant;
	/** Read-only viewer (no edits). */
	readOnly?: boolean;
	/**
	 * Autocomplete / path-lint mode.
	 * - template: `{{…}}` (default)
	 * - jmespath: bare JMESPath
	 * - template+eta: `{{…}}` plus Eta `it.*`
	 * - header-key: common HTTP header names
	 * - header-value: common values for `headerName` + `{{…}}` templates
	 * - none: no path completion
	 */
	completionMode?: CodeEditorCompletionMode;
	/** Header name used when `completionMode` is `header-value`. */
	headerName?: string;
	/** Warn when template/JMESPath tokens are unknown. Default true when mode ≠ none. */
	pathLint?: boolean;
	minHeight?: string;
	maxHeight?: string;
	className?: string;
	id?: string;
	ariaLabel?: string;
};

const compactSetup: BasicSetupOptions = {
	lineNumbers: false,
	foldGutter: false,
	highlightActiveLine: false,
	highlightActiveLineGutter: false,
	autocompletion: false,
	searchKeymap: false,
	tabSize: 2,
};

const documentSetup: BasicSetupOptions = {
	lineNumbers: true,
	foldGutter: true,
	highlightActiveLine: true,
	highlightActiveLineGutter: true,
	autocompletion: false,
	searchKeymap: true,
	tabSize: 2,
};

function languageExtensions(
	language: CodeEditorLanguage,
	lint: boolean,
): Extension[] {
	switch (language) {
		case "json": {
			const ext: Extension[] = [json()];
			if (lint) ext.push(linter(jsonParseLinter()));
			return ext;
		}
		case "xml":
			return [xml()];
		case "html":
			return [html()];
		default:
			return [];
	}
}

/**
 * Themed CodeMirror editor with Quester `{{...}}` template highlighting and
 * context-aware autocomplete. Used for every editable JSON / template field.
 */
export function CodeEditor({
	value,
	onChange,
	onBlur,
	placeholder,
	language = "text",
	lint = language === "json",
	formatOnBlur = false,
	singleLine = false,
	variant = "compact",
	readOnly = false,
	completionMode = "template",
	headerName = "",
	pathLint = completionMode !== "none" && completionMode !== "header-key",
	minHeight,
	maxHeight,
	className,
	id,
	ariaLabel,
}: CodeEditorProps) {
	// Read completion context lazily so extensions never rebuild on keystroke.
	const contextRef = useRef(selectTemplateContext(useQuesterStore.getState()));
	const headerNameRef = useRef(headerName);
	useEffect(
		() =>
			useQuesterStore.subscribe((state) => {
				contextRef.current = selectTemplateContext(state);
			}),
		[],
	);
	useEffect(() => {
		headerNameRef.current = headerName;
	}, [headerName]);

	const isDocument = variant === "document";
	const effectiveCompletion = readOnly ? "none" : completionMode;
	const effectivePathLint =
		effectiveCompletion !== "none" && effectiveCompletion !== "header-key"
			? pathLint
			: false;

	const extensions = useMemo<Extension[]>(() => {
		const ext: Extension[] = [
			...(themeExtensions as Extension[]),
			EditorView.contentAttributes.of(
				ariaLabel ? { "aria-label": ariaLabel } : {},
			),
			// React Flow listens for Backspace/Delete on document; composedPath may be a
			// Text node inside cm-content so RF's isInputDOMNode misses. Stop bubble.
			EditorView.domEventHandlers({
				keydown(event) {
					if (event.key === "Backspace" || event.key === "Delete") {
						event.stopPropagation();
					}
					return false;
				},
			}),
			...languageExtensions(language, lint && !readOnly),
		];

		if (readOnly) {
			ext.push(EditorView.editable.of(false));
		}

		if (effectiveCompletion === "template") {
			ext.push(templateCompletion(() => contextRef.current));
			ext.push(templateHoverTooltip(() => contextRef.current));
			if (effectivePathLint)
				ext.push(templatePathLinter(() => contextRef.current));
		} else if (effectiveCompletion === "template+eta") {
			ext.push(templateAndEtaCompletion(() => contextRef.current));
			ext.push(templateHoverTooltip(() => contextRef.current));
			if (effectivePathLint)
				ext.push(templatePathLinter(() => contextRef.current));
		} else if (effectiveCompletion === "jmespath") {
			ext.push(jmesPathCompletion(() => contextRef.current.jmesPaths));
			if (effectivePathLint) {
				ext.push(jmesPathLinter(() => contextRef.current.jmesPaths));
			}
		} else if (effectiveCompletion === "header-key") {
			ext.push(staticCompletion(headerNameSuggestions));
		} else if (effectiveCompletion === "header-value") {
			ext.push(
				templateOrStaticCompletion(
					() => contextRef.current,
					(word) => headerValueSuggestions(word, headerNameRef.current),
				),
			);
			ext.push(templateHoverTooltip(() => contextRef.current));
			if (effectivePathLint)
				ext.push(templatePathLinter(() => contextRef.current));
		}

		if (singleLine) {
			ext.push(singleLineExtension as Extension);
		} else {
			ext.push(EditorView.lineWrapping);
		}
		return ext;
	}, [
		language,
		lint,
		singleLine,
		ariaLabel,
		effectiveCompletion,
		effectivePathLint,
		readOnly,
	]);

	const handleBlur = () => {
		if (readOnly) {
			onBlur?.();
			return;
		}
		if (formatOnBlur && language === "json" && value.trim()) {
			try {
				const formatted = JSON.stringify(JSON.parse(value), null, 2);
				if (formatted !== value) onChange?.(formatted);
			} catch {
				/* keep raw text when it is not valid JSON */
			}
		}
		onBlur?.();
	};

	const basicSetup = useMemo<BasicSetupOptions>(() => {
		const base = isDocument ? documentSetup : compactSetup;
		if (singleLine) {
			return { ...base, highlightSelectionMatches: false, foldGutter: false };
		}
		return base;
	}, [isDocument, singleLine]);

	const resolvedMinHeight = minHeight ?? (isDocument ? "16rem" : undefined);

	return (
		<CodeMirror
			id={id}
			value={value}
			onChange={readOnly ? undefined : onChange}
			onBlur={handleBlur}
			placeholder={placeholder}
			basicSetup={basicSetup}
			extensions={extensions}
			minHeight={resolvedMinHeight}
			maxHeight={maxHeight}
			editable={!readOnly}
			theme="none"
			className={cn(
				// React Flow: skip canvas delete/hotkeys while interacting here
				"nokey rounded-md border bg-muted/20 px-2 py-1.5 text-xs focus-within:ring-1 focus-within:ring-ring",
				isDocument && "min-h-0 flex-1",
				className,
			)}
		/>
	);
}
