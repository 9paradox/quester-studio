import {
	CodeEditor,
	type CodeEditorCompletionMode,
} from "@/components/CodeEditor.js";

type TemplateFieldProps = {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	multiline?: boolean;
	rows?: number;
	className?: string;
	onBlur?: () => void;
	completionMode?: CodeEditorCompletionMode;
	/** Used when `completionMode` is `header-value`. */
	headerName?: string;
};

/**
 * Template / path field with highlighting and context-aware autocomplete,
 * backed by CodeMirror.
 */
export function TemplateField({
	id,
	value,
	onChange,
	placeholder,
	multiline = false,
	rows = 4,
	className,
	onBlur,
	completionMode = "template",
	headerName,
}: TemplateFieldProps) {
	return (
		<CodeEditor
			id={id}
			value={value}
			onChange={onChange}
			onBlur={onBlur}
			placeholder={placeholder}
			language="text"
			singleLine={!multiline}
			completionMode={completionMode}
			headerName={headerName}
			minHeight={
				multiline ? `${Math.max(rows, 2) * 1.25 + 0.75}rem` : undefined
			}
			className={className}
		/>
	);
}
