import { CodeEditor } from "@/components/CodeEditor.js";

type TemplateFieldProps = {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	multiline?: boolean;
	rows?: number;
	className?: string;
	onBlur?: () => void;
};

/**
 * Template field with {{var}} highlighting and context-aware autocomplete,
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
			minHeight={
				multiline ? `${Math.max(rows, 2) * 1.25 + 0.75}rem` : undefined
			}
			className={className}
		/>
	);
}
