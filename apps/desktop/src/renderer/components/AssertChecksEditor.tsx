import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
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
	type JsonDraftState,
	createJsonDraft,
	jsonDraftDidCommit,
	updateJsonDraft,
} from "@/lib/jsonDraft.js";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";

export type AssertCheck = {
	path: string;
	equals?: unknown;
};

export type AssertCheckMode = "truthy" | "equals";

export function assertCheckMode(check: AssertCheck): AssertCheckMode {
	return "equals" in check ? "equals" : "truthy";
}

export function setAssertCheckMode(
	check: AssertCheck,
	mode: AssertCheckMode,
): AssertCheck {
	if (mode === "truthy") {
		return { path: check.path || "ok" };
	}
	if ("equals" in check) return check;
	return { ...check, equals: null };
}

export function normalizeAssertChecks(value: unknown): AssertCheck[] {
	if (!Array.isArray(value) || value.length === 0) {
		return [{ path: "ok" }];
	}
	return value.map((item) => {
		if (typeof item !== "object" || item === null || Array.isArray(item)) {
			return { path: "ok" };
		}
		const row = item as Record<string, unknown>;
		const path = typeof row.path === "string" && row.path ? row.path : "ok";
		if ("equals" in row) return { path, equals: row.equals };
		return { path };
	});
}

export function formatAssertCheckSummary(checks: AssertCheck[]): string {
	if (checks.length === 0) return "No checks";
	const first = checks[0];
	if (!first) return "No checks";
	const head =
		assertCheckMode(first) === "equals"
			? `${first.path} = ${summarizeEquals(first.equals)}`
			: `${first.path} (truthy)`;
	if (checks.length === 1) return head;
	return `${head} +${checks.length - 1} more`;
}

function summarizeEquals(value: unknown): string {
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (value === null) return "null";
	try {
		const text = JSON.stringify(value);
		return text.length > 24 ? `${text.slice(0, 21)}…` : text;
	} catch {
		return "…";
	}
}

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
					<Input
						value={check.path}
						onChange={(e) => onChange({ ...check, path: e.target.value })}
						className="font-mono text-xs"
						placeholder="status"
						spellCheck={false}
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
