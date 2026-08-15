import { JmesPathField, JmesPathHelpText } from "@/components/JmesPathField.js";
import { Button } from "@/components/ui/button.js";
import { Label } from "@/components/ui/label.js";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select.js";
import { Textarea } from "@/components/ui/textarea.js";
import {
	type AssertCheck,
	assertCheckMode,
	assertCheckModes,
	assertCheckValue,
	checkOpLabel,
	checkOpNeedsValue,
	normalizeAssertChecks,
	setAssertCheckMode,
} from "@/lib/assertChecks.js";
import {
	type JsonDraftState,
	createJsonDraft,
	jsonDraftDidCommit,
	updateJsonDraft,
} from "@/lib/jsonDraft.js";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";

export type { AssertCheck, AssertCheckMode } from "@/lib/assertChecks.js";
export {
	assertCheckMode,
	formatAssertCheckSummary,
	normalizeAssertChecks,
	setAssertCheckMode,
} from "@/lib/assertChecks.js";

type AssertChecksEditorProps = {
	checks: unknown;
	onChange: (checks: AssertCheck[]) => void;
	/** Minimum rows (assert defaults to 1; if can be 0). */
	minChecks?: number;
};

export function AssertChecksEditor({
	checks,
	onChange,
	minChecks = 1,
}: AssertChecksEditorProps) {
	const rows = normalizeAssertChecks(checks, {
		allowEmpty: minChecks === 0,
	});

	const updateRow = (index: number, next: AssertCheck) => {
		onChange(rows.map((row, i) => (i === index ? next : row)));
	};

	const removeRow = (index: number) => {
		if (rows.length <= minChecks) return;
		onChange(rows.filter((_, i) => i !== index));
	};

	const addRow = () => {
		onChange([...rows, { path: "ok", op: "truthy" }]);
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: plan 19 — group label without fieldset layout change
		<div
			role="group"
			aria-label="Assertion checks"
			className="flex flex-col gap-3"
		>
			{rows.map((row, index) => (
				<AssertCheckRow
					key={`check-${index}-${assertCheckMode(row)}`}
					check={row}
					canRemove={rows.length > minChecks}
					onChange={(next) => updateRow(index, next)}
					onRemove={() => removeRow(index)}
				/>
			))}
			<Button type="button" variant="outline" size="sm" onClick={addRow}>
				<IconPlus data-icon="inline-start" />
				Add check
			</Button>
			<JmesPathHelpText />
		</div>
	);
}

function AssertCheckRow({
	check,
	canRemove,
	onChange,
	onRemove,
}: {
	check: AssertCheck;
	canRemove: boolean;
	onChange: (check: AssertCheck) => void;
	onRemove: () => void;
}) {
	const mode = assertCheckMode(check);
	const needsValue = checkOpNeedsValue(mode);
	const [valueDraft, setValueDraft] = useState<JsonDraftState>(() =>
		createJsonDraft(assertCheckValue(check)),
	);

	useEffect(() => {
		if (!needsValue) return;
		const expected = assertCheckValue(check);
		setValueDraft((current) => {
			if (current.error === null) {
				try {
					if (JSON.stringify(current.committed) === JSON.stringify(expected)) {
						return current;
					}
				} catch {
					/* fall through */
				}
			}
			return createJsonDraft(expected);
		});
	}, [needsValue, check]);

	return (
		<div className="flex flex-col gap-2 rounded-md border border-border/70 bg-muted/10 p-2">
			<div className="flex items-end gap-2">
				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground">
						Path (JMESPath)
					</Label>
					<JmesPathField
						value={check.path}
						onChange={(path) => onChange({ ...check, path })}
						placeholder="status"
						showHelp={false}
					/>
				</div>
				{canRemove ? (
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						aria-label="Remove check"
						onClick={onRemove}
					>
						<IconTrash />
					</Button>
				) : null}
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs text-muted-foreground">Operator</Label>
				<Select
					value={mode}
					onValueChange={(value) => {
						if (!assertCheckModes.includes(value as typeof mode)) return;
						onChange(setAssertCheckMode(check, value as typeof mode));
					}}
				>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{assertCheckModes.map((op) => (
							<SelectItem key={op} value={op}>
								{checkOpLabel(op)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{needsValue ? (
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground">Value (JSON)</Label>
					<Textarea
						value={valueDraft.text}
						onChange={(e) => {
							const next = updateJsonDraft(valueDraft, e.target.value);
							setValueDraft(next);
							if (jsonDraftDidCommit(valueDraft, next)) {
								onChange({
									path: check.path,
									op: mode,
									value: next.committed,
								});
							}
						}}
						className="min-h-16 font-mono text-xs"
						spellCheck={false}
					/>
					{valueDraft.error ? (
						<p className="text-xs text-destructive">{valueDraft.error}</p>
					) : null}
				</div>
			) : null}
		</div>
	);
}
