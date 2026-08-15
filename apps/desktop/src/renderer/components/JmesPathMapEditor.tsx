import { JmesPathField } from "@/components/JmesPathField.js";
import {
	type KeyValueRow,
	recordToRows,
	rowsToStringRecord,
} from "@/components/KeyValueEditor.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";

type JmesPathMapEditorProps = {
	value: Record<string, unknown> | undefined;
	onChange: (value: Record<string, string>) => void;
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
 * Key → JMESPath expression rows (`transform.map`).
 */
export function JmesPathMapEditor({
	value,
	onChange,
	valuePlaceholder = "body.id",
	keyPlaceholder = "key",
}: JmesPathMapEditorProps) {
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
		onChange(rowsToStringRecord(normalized));
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: plan 19 — group label without fieldset layout change
		<div role="group" aria-label="JMESPath map" className="flex flex-col gap-2">
			<div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] gap-1.5 px-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
				<span>Key</span>
				<span>JMESPath</span>
				<span className="w-7" />
			</div>
			{rows.map((row) => (
				<div
					key={row.id}
					className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] items-start gap-1.5"
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
					<JmesPathField
						value={row.value}
						onChange={(v) => {
							const next = rows.map((r) =>
								r.id === row.id ? { ...r, value: v } : r,
							);
							commit(next);
						}}
						placeholder={valuePlaceholder}
						showHelp={false}
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
