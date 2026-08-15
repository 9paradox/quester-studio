import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";

export type SwitchCaseRow = {
	value: string;
	handle: string;
};

type SwitchCaseDraft = SwitchCaseRow & { id: string };

function newRowId(): string {
	return `sc-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeSwitchCases(cases: unknown): SwitchCaseRow[] {
	if (!Array.isArray(cases) || cases.length === 0) {
		return [{ value: "ok", handle: "success" }];
	}
	const rows: SwitchCaseRow[] = [];
	for (const item of cases) {
		if (!item || typeof item !== "object") continue;
		const record = item as Record<string, unknown>;
		const value = typeof record.value === "string" ? record.value : "";
		const handle = typeof record.handle === "string" ? record.handle : "";
		rows.push({ value, handle });
	}
	return rows.length > 0 ? rows : [{ value: "ok", handle: "success" }];
}

/** Suggest a unique handle slug for a new case row. */
export function nextSwitchCaseHandle(existing: SwitchCaseRow[]): string {
	const used = new Set(
		existing.map((r) => r.handle.trim()).filter((h) => h.length > 0),
	);
	let n = existing.length + 1;
	let candidate = `case-${n}`;
	while (used.has(candidate)) {
		n += 1;
		candidate = `case-${n}`;
	}
	return candidate;
}

function toDrafts(cases: unknown): SwitchCaseDraft[] {
	return normalizeSwitchCases(cases).map((row) => ({
		...row,
		id: newRowId(),
	}));
}

function toPayload(rows: SwitchCaseDraft[]): SwitchCaseRow[] {
	return rows.map(({ value, handle }) => ({ value, handle }));
}

type SwitchCasesEditorProps = {
	cases: unknown;
	onChange: (cases: SwitchCaseRow[]) => void;
};

export function SwitchCasesEditor({ cases, onChange }: SwitchCasesEditorProps) {
	const [rows, setRows] = useState<SwitchCaseDraft[]>(() => toDrafts(cases));

	useEffect(() => {
		setRows((current) => {
			const next = normalizeSwitchCases(cases);
			const curr = toPayload(current);
			if (JSON.stringify(next) === JSON.stringify(curr)) return current;
			return toDrafts(cases);
		});
	}, [cases]);

	const commit = (next: SwitchCaseDraft[]) => {
		setRows(next);
		onChange(toPayload(next));
	};

	const updateRow = (id: string, patch: Partial<SwitchCaseRow>) => {
		commit(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
	};

	const removeRow = (id: string) => {
		if (rows.length <= 1) return;
		commit(rows.filter((row) => row.id !== id));
	};

	const addRow = () => {
		commit([
			...rows,
			{
				id: newRowId(),
				value: "",
				handle: nextSwitchCaseHandle(toPayload(rows)),
			},
		]);
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: plan 19 — group label without fieldset layout change
		<div role="group" aria-label="Switch cases" className="flex flex-col gap-3">
			{rows.map((row) => (
				<div
					key={row.id}
					className="flex flex-col gap-2 rounded-md border border-border/70 bg-muted/10 p-2"
				>
					<div className="flex items-end gap-2">
						<div className="flex min-w-0 flex-1 flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground">Value</Label>
							<Input
								value={row.value}
								onChange={(e) => updateRow(row.id, { value: e.target.value })}
								placeholder="ok"
							/>
						</div>
						{rows.length > 1 ? (
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								aria-label="Remove case"
								onClick={() => removeRow(row.id)}
							>
								<IconTrash />
							</Button>
						) : null}
					</div>
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground">
							Handle (sourceHandle)
						</Label>
						<Input
							value={row.handle}
							onChange={(e) => updateRow(row.id, { handle: e.target.value })}
							placeholder="success"
							className="font-mono"
						/>
					</div>
				</div>
			))}
			<Button type="button" variant="outline" size="sm" onClick={addRow}>
				<IconPlus data-icon="inline-start" />
				Add case
			</Button>
		</div>
	);
}
