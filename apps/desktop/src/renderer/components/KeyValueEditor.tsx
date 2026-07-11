import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useCallback, useMemo } from "react";

export type KeyValueRow = { id: string; key: string; value: string };

let rowCounter = 0;
function newRow(key = "", value = ""): KeyValueRow {
	rowCounter += 1;
	return { id: `row-${rowCounter}`, key, value };
}

export function recordToRows(
	record: Record<string, string | number | boolean>,
): KeyValueRow[] {
	const rows = Object.entries(record).map(([key, value]) =>
		newRow(key, String(value)),
	);
	return rows.length > 0 ? rows : [newRow()];
}

export function rowsToStringRecord(
	rows: KeyValueRow[],
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const row of rows) {
		const k = row.key.trim();
		if (!k) continue;
		out[k] = row.value;
	}
	return out;
}

export function rowsToEnvVariables(
	rows: KeyValueRow[],
): Record<string, string | number | boolean> {
	const out: Record<string, string | number | boolean> = {};
	for (const row of rows) {
		const k = row.key.trim();
		if (!k) continue;
		const raw = row.value.trim();
		if (raw === "true") out[k] = true;
		else if (raw === "false") out[k] = false;
		else if (
			raw !== "" &&
			!Number.isNaN(Number(raw)) &&
			/^-?\d+(\.\d+)?$/.test(raw)
		) {
			out[k] = Number(raw);
		} else {
			out[k] = row.value;
		}
	}
	return out;
}

type KeyValueEditorProps = {
	title: string;
	description?: string;
	rows: KeyValueRow[];
	onChange: (rows: KeyValueRow[]) => void;
	valuePlaceholder?: string;
};

export function KeyValueEditor({
	title,
	description,
	rows,
	onChange,
	valuePlaceholder = "Value",
}: KeyValueEditorProps) {
	const displayRows = useMemo(
		() => (rows.length === 0 ? [newRow()] : rows),
		[rows],
	);

	const updateRow = useCallback(
		(id: string, patch: Partial<Pick<KeyValueRow, "key" | "value">>) => {
			onChange(
				displayRows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
			);
		},
		[displayRows, onChange],
	);

	const removeRow = useCallback(
		(id: string) => {
			const next = displayRows.filter((row) => row.id !== id);
			onChange(next.length === 0 ? [newRow()] : next);
		},
		[displayRows, onChange],
	);

	const addRow = useCallback(() => {
		onChange([...displayRows, newRow()]);
	}, [displayRows, onChange]);

	return (
		<div className="flex h-full flex-col">
			<div className="shrink-0 border-b px-4 py-3">
				<h2 className="text-sm font-medium">{title}</h2>
				{description ? (
					<p className="mt-1 text-xs text-muted-foreground">{description}</p>
				) : null}
			</div>
			<ScrollArea className="min-h-0 flex-1">
				<div className="flex flex-col gap-2 p-4">
					<div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
						<span>Key</span>
						<span>Value</span>
						<span className="w-7" />
					</div>
					{displayRows.map((row) => (
						<div
							key={row.id}
							className="grid grid-cols-[1fr_1fr_auto] items-center gap-2"
						>
							<Input
								value={row.key}
								onChange={(e) => updateRow(row.id, { key: e.target.value })}
								placeholder="KEY"
								className="h-8 font-mono text-xs"
							/>
							<Input
								value={row.value}
								onChange={(e) => updateRow(row.id, { value: e.target.value })}
								placeholder={valuePlaceholder}
								className="h-8 font-mono text-xs"
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								onClick={() => removeRow(row.id)}
								aria-label="Remove row"
							>
								<IconTrash />
							</Button>
						</div>
					))}
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="mt-2 w-fit"
						onClick={addRow}
					>
						<IconPlus />
						Add entry
					</Button>
				</div>
			</ScrollArea>
		</div>
	);
}
