import {
	CodeEditor,
	type CodeEditorCompletionMode,
} from "@/components/CodeEditor.js";
import { PathPickerField } from "@/components/PathPickerDialog.js";
import { buildTemplatePickerPaths } from "@/lib/pathPicker.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import { selectTemplateContext } from "@/stores/selectors.js";
import { useShallow } from "zustand/react/shallow";

type TemplateFieldProps = {
	id?: string;
	ariaLabel?: string;
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
	/**
	 * Show Pick path for template modes. Defaults on for `template` /
	 * `template+eta`; off for headers / jmespath (JmesPathField has its own).
	 */
	showPickPath?: boolean;
};

/**
 * Template / path field with highlighting and context-aware autocomplete,
 * backed by CodeMirror.
 */
export function TemplateField({
	id,
	ariaLabel,
	value,
	onChange,
	placeholder,
	multiline = false,
	rows = 4,
	className,
	onBlur,
	completionMode = "template",
	headerName,
	showPickPath,
}: TemplateFieldProps) {
	const defaultPick =
		completionMode === "template" || completionMode === "template+eta";
	const pickEnabled = showPickPath ?? defaultPick;

	const templatePaths = useQuesterStore(
		useShallow((state) => {
			if (!pickEnabled) return [] as string[];
			return buildTemplatePickerPaths(selectTemplateContext(state));
		}),
	);

	const editor = (
		<CodeEditor
			id={id}
			ariaLabel={ariaLabel}
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

	if (!pickEnabled) return editor;

	return (
		<PathPickerField
			paths={templatePaths}
			title="Pick template path"
			description="Insert a {{…}} token from env, input, vars, or node outputs."
			emptyMessage="No template paths yet. Open an env, set run input, or run the flow so node outputs are known."
			triggerTitle="Insert a template path token"
			onPick={(path) => onChange(path)}
		>
			{editor}
		</PathPickerField>
	);
}
