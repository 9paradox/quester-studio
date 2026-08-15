import { PathPickerField } from "@/components/PathPickerDialog.js";
import { TemplateField } from "@/components/TemplateField.js";
import {
	buildJmesPathPickerPaths,
	buildTemplatePickerPaths,
} from "@/lib/pathPicker.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import { selectTemplateContext } from "@/stores/selectors.js";
import { useShallow } from "zustand/react/shallow";

type ForeachItemsFieldProps = {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
};

/** True when foreach items should use template assist (runtime branches on `{{`). */
export function isForeachTemplateItems(value: string): boolean {
	return value.includes("{{");
}

/**
 * Dual-mode foreach `items` field: JMESPath when bare, templates when `{{` present.
 */
export function ForeachItemsField({
	id,
	value,
	onChange,
	placeholder = "body.users",
}: ForeachItemsFieldProps) {
	const templateMode = isForeachTemplateItems(value);

	const paths = useQuesterStore(
		useShallow((state) => {
			const ctx = selectTemplateContext(state);
			return templateMode
				? buildTemplatePickerPaths(ctx)
				: buildJmesPathPickerPaths(ctx.previousPaths, ctx.jmesPaths);
		}),
	);

	return (
		<div className="flex flex-col gap-1.5">
			<PathPickerField
				paths={paths}
				title={templateMode ? "Pick template path" : "Pick JMESPath"}
				description={
					templateMode
						? "Insert a {{…}} token. Prefer a template that resolves to a JSON array string."
						: "Paths from the previous node output (contracts and last run)."
				}
				emptyMessage={
					templateMode
						? "No template paths yet. Open an env, set run input, or run the flow first."
						: "No paths yet. Run the flow so the previous node leaves an object output, then try again."
				}
				triggerTitle={
					templateMode
						? "Insert a template path token"
						: "Insert a path from the previous node output"
				}
				onPick={(path) => onChange(path)}
			>
				<TemplateField
					id={id}
					value={value}
					onChange={onChange}
					placeholder={placeholder}
					completionMode={templateMode ? "template" : "jmespath"}
					showPickPath={false}
				/>
			</PathPickerField>
			<p className="text-2xs leading-relaxed text-muted-foreground">
				Uses JMESPath on the previous output, or a{" "}
				<code className="font-mono text-3xs">{"{{…}}"}</code> template that
				resolves to a JSON array. Assist switches to templates when{" "}
				<code className="font-mono text-3xs">{"{{"}</code> appears in the field.
			</p>
		</div>
	);
}
