import {
	type KeyValueRow,
	recordToRows,
	rowsToEnvVariables,
	rowsToStringRecord,
} from "@/components/KeyValueEditor.js";
import { TemplateField } from "@/components/TemplateField.js";
import { KeyValueGridHead } from "@/components/Typography.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";

type TemplateMapEditorProps = {
	value: Record<string, unknown> | undefined;
	onChange: (value: Record<string, string | number | boolean>) => void;
	/** When true, coerce number/boolean strings like env vars (`set`). Default false (all strings). */
	coerceScalars?: boolean;
	valuePlaceholder?: string;
	keyPlaceholder?: string;
};

function toStringRecord(
	value: Record<string, unknown> | undefined,
): Record<string, string> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(value)) {
		if (v === undefined || v === null) continue;
		out[k] = typeof v === "string" ? v : String(v);
	}
	return out;
}

/**
 * Key → templated value rows (set / output / subflow / form prefill).
 */
export function TemplateMapEditor({
	value,
	onChange,
	coerceScalars = false,
	valuePlaceholder = "{{input.value}}",
	keyPlaceholder = "key",
}: TemplateMapEditorProps) {
	const [rows, setRows] = useState<KeyValueRow[]>(() =>
		recordToRows(toStringRecord(value)),
	);

	const fingerprint = JSON.stringify(toStringRecord(value));
	useEffect(() => {
		setRows(recordToRows(JSON.parse(fingerprint) as Record<string, string>));
	}, [fingerprint]);

	const commit = (next: KeyValueRow[]) => {
		const normalized = next.length === 0 ? recordToRows({}) : next;
		setRows(normalized);
		if (coerceScalars) {
			onChange(rowsToEnvVariables(normalized));
		} else {
			onChange(rowsToStringRecord(normalized));
		}
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: plan 19 — group label without fieldset layout change
		<div role="group" aria-label="Template map" className="flex flex-col gap-2">
			<KeyValueGridHead keyLabel="Key" valueLabel="Value" />
			{rows.map((row) => (
				<div
					key={row.id}
					className="grid grid-cols-[1fr_1fr_auto] items-start gap-1.5"
				>
					<Input
						value={row.key}
						onChange={(e) => {
							const next = rows.map((r) =>
								r.id === row.id ? { ...r, key: e.target.value } : r,
							);
							commit(next);
						}}
						placeholder={keyPlaceholder}
						className="h-8 font-mono text-xs"
					/>
					<TemplateField
						value={row.value}
						onChange={(v) => {
							const next = rows.map((r) =>
								r.id === row.id ? { ...r, value: v } : r,
							);
							commit(next);
						}}
						placeholder={valuePlaceholder}
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						className="mt-1"
						aria-label="Remove row"
						onClick={() => commit(rows.filter((r) => r.id !== row.id))}
					>
						<IconTrash />
					</Button>
				</div>
			))}
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="w-fit"
				onClick={() =>
					commit([...rows, { id: `row-${Date.now()}`, key: "", value: "" }])
				}
			>
				<IconPlus data-icon="inline-start" />
				Add entry
			</Button>
		</div>
	);
}
