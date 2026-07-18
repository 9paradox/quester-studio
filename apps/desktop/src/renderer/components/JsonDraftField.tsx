import { Textarea } from "@/components/ui/textarea.js";
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
	minRowsClassName?: string;
};

/**
 * Controlled JSON editor that keeps intermediate invalid text editable.
 * Calls onCommit only after a successful parse.
 */
export function JsonDraftField({
	value,
	onCommit,
	className,
	minRowsClassName = "min-h-24",
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
			<Textarea
				value={draft.text}
				onChange={(e) => {
					const next = updateJsonDraft(draft, e.target.value);
					setDraft(next);
					if (jsonDraftDidCommit(draft, next)) {
						onCommit(next.committed);
					}
				}}
				className={`${minRowsClassName} font-mono text-xs ${className ?? ""}`}
				spellCheck={false}
			/>
			{draft.error ? (
				<p className="text-xs text-destructive">{draft.error}</p>
			) : null}
		</div>
	);
}
