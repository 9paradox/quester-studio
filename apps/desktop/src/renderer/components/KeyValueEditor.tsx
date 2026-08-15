import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import {
	IconDeviceFloppy,
	IconEye,
	IconEyeOff,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";

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
	description?: ReactNode;
	rows: KeyValueRow[];
	onChange: (rows: KeyValueRow[]) => void;
	valuePlaceholder?: string;
	/** Mask value fields (password input + eye toggle). */
	maskValues?: boolean;
	onSave?: () => void;
	canSave?: boolean;
};

function MaskedValueInput({
	value,
	onChange,
	placeholder,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
}) {
	const [visible, setVisible] = useState(false);

	return (
		<div className="relative min-w-0">
			<Input
				type={visible ? "text" : "password"}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				autoComplete="off"
				className="h-8 pr-8 font-mono text-xs"
			/>
			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				className="absolute right-1 top-1/2 -translate-y-1/2"
				onClick={() => setVisible((v) => !v)}
				aria-label={visible ? "Hide value" : "Show value"}
			>
				{visible ? <IconEyeOff /> : <IconEye />}
			</Button>
		</div>
	);
}

export function KeyValueEditor({
	title,
	description,
	rows,
	onChange,
	valuePlaceholder = "Value",
	maskValues = false,
	onSave,
	canSave = false,
}: KeyValueEditorProps) {
	useEffect(() => {
		if (rows.length === 0) onChange([newRow()]);
	}, [rows.length, onChange]);

	const updateRow = useCallback(
		(id: string, patch: Partial<Pick<KeyValueRow, "key" | "value">>) => {
			onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
		},
		[rows, onChange],
	);

	const removeRow = useCallback(
		(id: string) => {
			const next = rows.filter((row) => row.id !== id);
			onChange(next.length === 0 ? [newRow()] : next);
		},
		[rows, onChange],
	);

	const addRow = useCallback(() => {
		onChange([...rows, newRow()]);
	}, [rows, onChange]);

	return (
		<div className="flex h-full flex-col">
			<div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3">
				<div className="min-w-0 flex-1">
					<h2 className="text-sm font-medium">{title}</h2>
					{description ? (
						<div className="mt-1 space-y-1 text-xs text-muted-foreground">
							{description}
						</div>
					) : null}
				</div>
				{onSave ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="mt-0.5 shrink-0"
						onClick={onSave}
						disabled={!canSave}
					>
						<IconDeviceFloppy data-icon="inline-start" />
						Save
					</Button>
				) : null}
			</div>
			<ScrollArea className="min-h-0 flex-1">
				<div className="flex flex-col gap-2 p-4">
					<div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1 text-3xs font-medium uppercase tracking-wide text-muted-foreground">
						<span>Key</span>
						<span>Value</span>
						<span className="w-7" />
					</div>
					{rows.map((row) => (
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
							{maskValues ? (
								<MaskedValueInput
									value={row.value}
									onChange={(value) => updateRow(row.id, { value })}
									placeholder={valuePlaceholder}
								/>
							) : (
								<Input
									value={row.value}
									onChange={(e) => updateRow(row.id, { value: e.target.value })}
									placeholder={valuePlaceholder}
									className="h-8 font-mono text-xs"
								/>
							)}
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
