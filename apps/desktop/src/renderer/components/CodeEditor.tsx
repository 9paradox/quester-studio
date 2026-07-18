import {
	singleLineExtension,
	templateCompletion,
	themeExtensions,
} from "@/lib/codemirrorSetup.js";
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

type CodeEditorProps = {
	value: string;
	onChange: (value: string) => void;
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
	minHeight?: string;
	maxHeight?: string;
	className?: string;
	id?: string;
	ariaLabel?: string;
};

const baseSetup: BasicSetupOptions = {
	lineNumbers: false,
	foldGutter: false,
	highlightActiveLine: false,
	highlightActiveLineGutter: false,
	autocompletion: false,
	searchKeymap: false,
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
	minHeight,
	maxHeight,
	className,
	id,
	ariaLabel,
}: CodeEditorProps) {
	// Read completion context lazily so extensions never rebuild on keystroke.
	const contextRef = useRef(selectTemplateContext(useQuesterStore.getState()));
	useEffect(
		() =>
			useQuesterStore.subscribe((state) => {
				contextRef.current = selectTemplateContext(state);
			}),
		[],
	);

	const extensions = useMemo<Extension[]>(() => {
		const ext: Extension[] = [
			...(themeExtensions as Extension[]),
			templateCompletion(() => contextRef.current),
			EditorView.contentAttributes.of(
				ariaLabel ? { "aria-label": ariaLabel } : {},
			),
			...languageExtensions(language, lint),
		];
		if (singleLine) {
			ext.push(singleLineExtension as Extension);
		} else {
			ext.push(EditorView.lineWrapping);
		}
		return ext;
	}, [language, lint, singleLine, ariaLabel]);

	const handleBlur = () => {
		if (formatOnBlur && language === "json" && value.trim()) {
			try {
				const formatted = JSON.stringify(JSON.parse(value), null, 2);
				if (formatted !== value) onChange(formatted);
			} catch {
				/* keep raw text when it is not valid JSON */
			}
		}
		onBlur?.();
	};

	const basicSetup = useMemo<BasicSetupOptions>(
		() =>
			singleLine
				? { ...baseSetup, highlightSelectionMatches: false }
				: baseSetup,
		[singleLine],
	);

	return (
		<CodeMirror
			id={id}
			value={value}
			onChange={onChange}
			onBlur={handleBlur}
			placeholder={placeholder}
			basicSetup={basicSetup}
			extensions={extensions}
			minHeight={minHeight}
			maxHeight={maxHeight}
			theme="none"
			className={cn(
				"rounded-md border bg-muted/20 px-2 py-1.5 text-xs focus-within:ring-1 focus-within:ring-ring",
				className,
			)}
		/>
	);
}
