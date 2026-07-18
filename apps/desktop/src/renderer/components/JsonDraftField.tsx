import { CodeEditor } from "@/components/CodeEditor.js";
import {
	type JsonDraftState,
	createJsonDraft,
	jsonDraftDidCommit,
	updateJsonDraft,
} from "@/lib/jsonDraft.js";
import { useEffect, useState } from "react";

type JsonDraftFieldProps = {
	value: unknown;
	onCommit: (value: unknown) => void;
	className?: string;
	minHeight?: string;
	id?: string;
	placeholder?: string;
};

/**
 * Controlled JSON editor that keeps intermediate invalid text editable.
 * Calls onCommit only after a successful parse.
 */
export function JsonDraftField({
	value,
	onCommit,
	className,
	minHeight = "6rem",
	id,
	placeholder,
}: JsonDraftFieldProps) {
	const [draft, setDraft] = useState<JsonDraftState>(() =>
		createJsonDraft(value),
	);

	useEffect(() => {
		setDraft((current) => {
			if (current.error === null) {
				try {
					if (JSON.stringify(current.committed) === JSON.stringify(value)) {
						return current;
					}
				} catch {
					/* fall through */
				}
			}
			return createJsonDraft(value);
		});
	}, [value]);

	return (
		<div className="flex flex-col gap-1.5">
			<CodeEditor
				id={id}
				value={draft.text}
				language="json"
				minHeight={minHeight}
				placeholder={placeholder}
				className={className}
				onChange={(text) => {
					const next = updateJsonDraft(draft, text);
					setDraft(next);
					if (jsonDraftDidCommit(draft, next)) {
						onCommit(next.committed);
					}
				}}
			/>
			{draft.error ? (
				<p className="text-xs text-destructive">{draft.error}</p>
			) : null}
		</div>
	);
}
