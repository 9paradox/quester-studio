import {
	type KeyValueRow,
	recordToRows,
	rowsToStringRecord,
} from "@/components/KeyValueEditor.js";
import { TemplateField } from "@/components/TemplateField.js";
import { Button } from "@/components/ui/button.js";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs.js";
import { parseRawHeaders, stringifyRawHeaders } from "@/lib/rawHeaders.js";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

type HeadersEditorProps = {
	headers: Record<string, string>;
	onChange: (headers: Record<string, string>) => void;
};

/** Headers editor with key-value and raw text modes. */
export function HeadersEditor({ headers, onChange }: HeadersEditorProps) {
	const [rows, setRows] = useState<KeyValueRow[]>(() => recordToRows(headers));
	const [rawText, setRawText] = useState(() => stringifyRawHeaders(headers));
	const [rawError, setRawError] = useState<string | null>(null);
	const [mode, setMode] = useState<"pairs" | "raw">("pairs");

	const commitRows = (next: KeyValueRow[]) => {
		const normalized = next.length === 0 ? recordToRows({}) : next;
		setRows(normalized);
		const record = rowsToStringRecord(normalized);
		setRawText(stringifyRawHeaders(record));
		setRawError(null);
		onChange(record);
	};

	const commitRaw = (raw: string) => {
		setRawText(raw);
		const result = parseRawHeaders(raw);
		setRawError(result.error);
		if (!result.headers) return;
		setRows(recordToRows(result.headers));
		onChange(result.headers);
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: plan 19 — group label without fieldset layout change
		<Tabs
			role="group"
			aria-label="Headers"
			value={mode}
			onValueChange={(v) => setMode((v as "pairs" | "raw") ?? "pairs")}
		>
			<TabsList variant="line" className="h-8 w-full justify-start">
				<TabsTrigger value="pairs" className="text-xs">
					Key-Value
				</TabsTrigger>
				<TabsTrigger value="raw" className="text-xs">
					Raw
				</TabsTrigger>
			</TabsList>
			<TabsContent value="pairs" className="mt-2 flex flex-col gap-2">
				<div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 px-0.5 text-3xs font-medium tracking-wide text-muted-foreground uppercase">
					<span>Header</span>
					<span>Value</span>
					<span className="w-7" />
				</div>
				{rows.map((row) => (
					<div
						key={row.id}
						className="grid grid-cols-[1fr_1fr_auto] items-start gap-1.5"
					>
						<TemplateField
							value={row.key}
							onChange={(key) => {
								const next = rows.map((r) =>
									r.id === row.id ? { ...r, key } : r,
								);
								commitRows(next);
							}}
							placeholder="Content-Type"
							completionMode="header-key"
							className="h-8"
							ariaLabel={row.key ? `Header name, ${row.key}` : "Header name"}
						/>
						<TemplateField
							value={row.value}
							onChange={(value) => {
								const next = rows.map((r) =>
									r.id === row.id ? { ...r, value } : r,
								);
								commitRows(next);
							}}
							placeholder="application/json"
							completionMode="header-value"
							headerName={row.key}
							ariaLabel={row.key ? `Header value, ${row.key}` : "Header value"}
						/>
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							className="mt-1"
							onClick={() => commitRows(rows.filter((r) => r.id !== row.id))}
							aria-label="Remove header"
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
						commitRows([
							...rows,
							{
								id: `row-${Date.now()}`,
								key: "",
								value: "",
							},
						])
					}
				>
					<IconPlus data-icon="inline-start" />
					Add header
				</Button>
			</TabsContent>
			<TabsContent value="raw" className="mt-2 flex flex-col gap-1.5">
				<TemplateField
					value={rawText}
					onChange={commitRaw}
					multiline
					rows={6}
					ariaLabel="Raw headers"
					placeholder={
						"Content-Type: application/json\nAuthorization: Bearer {{env.TOKEN}}"
					}
				/>
				{rawError ? (
					<p className="text-xs text-destructive">{rawError}</p>
				) : null}
			</TabsContent>
		</Tabs>
	);
}
