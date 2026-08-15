import { PathPickerField } from "@/components/PathPickerDialog.js";
import { TemplateField } from "@/components/TemplateField.js";
import { FieldHint } from "@/components/Typography.js";
import { buildJmesPathPickerPaths } from "@/lib/pathPicker.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import { selectTemplateContext } from "@/stores/selectors.js";
import { useShallow } from "zustand/react/shallow";

type JmesPathFieldProps = {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	/** Show short JMESPath help under the field. Default true. */
	showHelp?: boolean;
};

export function JmesPathHelpText() {
	return (
		<FieldHint>
			JMESPath selects values from JSON. Examples:{" "}
			<code className="font-mono text-3xs">body.id</code> for a nested field,{" "}
			<code className="font-mono text-3xs">[*].name</code> for each item&apos;s
			name.{" "}
			<a
				href="https://jmespath.org/"
				target="_blank"
				rel="noopener noreferrer"
				className="underline underline-offset-2 hover:text-foreground"
			>
				JMESPath docs
			</a>
		</FieldHint>
	);
}

export function JmesPathField({
	id,
	value,
	onChange,
	placeholder,
	showHelp = true,
}: JmesPathFieldProps) {
	// selectTemplateContext allocates new objects/arrays each call — useShallow
	// (and selecting only paths) keeps useSyncExternalStore from looping (#185).
	const paths = useQuesterStore(
		useShallow((state) => {
			const ctx = selectTemplateContext(state);
			return buildJmesPathPickerPaths(ctx.previousPaths, ctx.jmesPaths);
		}),
	);

	return (
		<div className="flex flex-col gap-1.5">
			<PathPickerField
				paths={paths}
				title="Pick JMESPath"
				description="Paths from the previous node output (contracts and last run)."
				emptyMessage="No paths yet. Run the flow so the previous node leaves an object output (not only a string), then open Pick path again."
				triggerTitle="Insert a path from the previous node output"
				onPick={(path) => onChange(path)}
			>
				<TemplateField
					id={id}
					value={value}
					onChange={onChange}
					placeholder={placeholder}
					completionMode="jmespath"
					showPickPath={false}
				/>
			</PathPickerField>
			{showHelp ? <JmesPathHelpText /> : null}
		</div>
	);
}
