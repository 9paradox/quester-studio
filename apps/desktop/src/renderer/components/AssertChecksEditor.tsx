import { TemplateField } from "@/components/TemplateField.js";
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
};

export function AssertChecksEditor({
	checks,
	onChange,
}: AssertChecksEditorProps) {
	const rows = normalizeAssertChecks(checks);

	const updateRow = (index: number, next: AssertCheck) => {
		onChange(rows.map((row, i) => (i === index ? next : row)));
	};

	const removeRow = (index: number) => {
		if (rows.length <= 1) return;
		onChange(rows.filter((_, i) => i !== index));
	};

	const addRow = () => {
		onChange([...rows, { path: "ok" }]);
	};

	return (
		<div className="flex flex-col gap-3">
			{rows.map((row, index) => (
				<AssertCheckRow
					key={`check-${index}-${assertCheckMode(row)}`}
					check={row}
					canRemove={rows.length > 1}
					onChange={(next) => updateRow(index, next)}
					onRemove={() => removeRow(index)}
				/>
			))}
			<Button type="button" variant="outline" size="sm" onClick={addRow}>
				<IconPlus data-icon="inline-start" />
				Add check
			</Button>
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
	const [equalsDraft, setEqualsDraft] = useState<JsonDraftState>(() =>
		createJsonDraft(check.equals ?? null),
	);

	useEffect(() => {
		if (mode !== "equals") return;
		setEqualsDraft((current) => {
			if (current.error === null) {
				try {
					if (
						JSON.stringify(current.committed) ===
						JSON.stringify(check.equals ?? null)
					) {
						return current;
					}
				} catch {
					/* fall through */
				}
			}
			return createJsonDraft(check.equals ?? null);
		});
	}, [mode, check.equals]);

	return (
		<div className="flex flex-col gap-2 rounded-md border border-border/70 bg-muted/10 p-2">
			<div className="flex items-end gap-2">
				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground">
						Path (JMESPath)
					</Label>
					<TemplateField
						value={check.path}
						onChange={(path) => onChange({ ...check, path })}
						placeholder="status"
						completionMode="jmespath"
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
				<Label className="text-xs text-muted-foreground">Mode</Label>
				<Select
					value={mode}
					onValueChange={(value) => {
						if (value !== "truthy" && value !== "equals") return;
						onChange(setAssertCheckMode(check, value));
					}}
				>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="truthy">Truthy (path must be truthy)</SelectItem>
						<SelectItem value="equals">Equals (exact match)</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{mode === "equals" ? (
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground">
						Expected value (JSON)
					</Label>
					<Textarea
						value={equalsDraft.text}
						onChange={(e) => {
							const next = updateJsonDraft(equalsDraft, e.target.value);
							setEqualsDraft(next);
							if (jsonDraftDidCommit(equalsDraft, next)) {
								onChange({ ...check, equals: next.committed });
							}
						}}
						className="min-h-16 font-mono text-xs"
						spellCheck={false}
					/>
					{equalsDraft.error ? (
						<p className="text-xs text-destructive">{equalsDraft.error}</p>
					) : null}
				</div>
			) : null}
		</div>
	);
}
