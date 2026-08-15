import { Button } from "@/components/ui/button.js";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog.js";
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
import { getQuesterClient } from "@/lib/quester-client.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import type { FormAwaitEvent } from "@quester-studio/api-contract";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ResolvedField = FormAwaitEvent["resolved"]["fields"][number];

export function FormAwaitDialog() {
	const pending = useQuesterStore((s) => s.pendingFormAwait);
	const clearPendingFormAwait = useQuesterStore((s) => s.clearPendingFormAwait);
	const stopFlow = useQuesterStore((s) => s.stopFlow);
	const showError = useQuesterStore((s) => s.showError);

	const [values, setValues] = useState<Record<string, unknown>>({});
	const [submitting, setSubmitting] = useState(false);

	const fields = pending?.resolved.fields ?? [];

	useEffect(() => {
		if (!pending) {
			setValues({});
			setSubmitting(false);
			return;
		}
		const initial: Record<string, unknown> = {};
		for (const field of pending.resolved.fields) {
			initial[field.id] = field.value;
		}
		setValues(initial);
		setSubmitting(false);
	}, [pending]);

	const title = useMemo(() => {
		if (!pending) return "Form";
		return pending.form.name || pending.formId;
	}, [pending]);

	const setFieldValue = (id: string, value: unknown) => {
		setValues((prev) => ({ ...prev, [id]: value }));
	};

	const handleSubmit = async () => {
		if (!pending) return;
		for (const field of fields) {
			if (!field.required || field.readonly) continue;
			const v = values[field.id];
			if (v === undefined || v === null || v === "") {
				toast.warning(`"${field.label ?? field.id}" is required`);
				return;
			}
		}
		setSubmitting(true);
		try {
			const result = await getQuesterClient().submitFormRun({
				runId: pending.runId,
				nodeId: pending.nodeId,
				values,
			});
			if (!result.ok) {
				showError(result.error ?? "Failed to submit form");
				setSubmitting(false);
				return;
			}
			clearPendingFormAwait();
		} catch (err) {
			showError(err instanceof Error ? err.message : "Failed to submit form");
			setSubmitting(false);
		}
	};

	const handleCancel = () => {
		stopFlow();
		clearPendingFormAwait();
	};

	return (
		<Dialog
			open={pending != null}
			onOpenChange={(open) => {
				if (!open) handleCancel();
			}}
		>
			<DialogContent
				className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
				showCloseButton={false}
			>
				<DialogHeader className="shrink-0 border-b px-4 py-3">
					<DialogTitle>{title}</DialogTitle>
					{pending?.form.description ? (
						<DialogDescription>{pending.form.description}</DialogDescription>
					) : (
						<DialogDescription>
							Fill in the fields to continue the flow run.
						</DialogDescription>
					)}
				</DialogHeader>

				<div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
					{fields.map((field) => (
						<ResolvedFieldControl
							key={field.id}
							field={field}
							value={values[field.id]}
							onChange={(value) => setFieldValue(field.id, value)}
						/>
					))}
					{fields.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							This form has no fields.
						</p>
					) : null}
				</div>

				<DialogFooter className="shrink-0 border-t px-4 py-3">
					<Button
						type="button"
						variant="outline"
						onClick={handleCancel}
						disabled={submitting}
					>
						Cancel run
					</Button>
					<Button
						type="button"
						onClick={() => void handleSubmit()}
						disabled={submitting}
					>
						{submitting ? "Submitting…" : "Submit"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ResolvedFieldControl({
	field,
	value,
	onChange,
}: {
	field: ResolvedField;
	value: unknown;
	onChange: (value: unknown) => void;
}) {
	const label = field.label ?? field.id;
	const disabled = field.readonly;
	const controlId = `form-await-${field.id}`;

	return (
		<div className="flex flex-col gap-1.5">
			<Label htmlFor={controlId} className="text-xs">
				{label}
				{field.required ? <span className="text-destructive"> *</span> : null}
			</Label>
			{field.description ? (
				<p className="text-xs text-muted-foreground">{field.description}</p>
			) : null}

			{field.type === "boolean" ? (
				<Select
					value={value === true ? "true" : value === false ? "false" : ""}
					onValueChange={(next) => {
						if (disabled) return;
						if (next === "true") onChange(true);
						else if (next === "false") onChange(false);
					}}
					disabled={disabled}
				>
					<SelectTrigger id={controlId} className="w-full">
						<SelectValue placeholder="Select…" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="true">true</SelectItem>
						<SelectItem value="false">false</SelectItem>
					</SelectContent>
				</Select>
			) : field.type === "select" ? (
				<Select
					value={value == null || value === "" ? undefined : String(value)}
					onValueChange={(next) => {
						if (disabled || typeof next !== "string") return;
						const match = field.options?.find(
							(opt) => String(opt.value) === next,
						);
						onChange(match ? match.value : next);
					}}
					disabled={disabled}
				>
					<SelectTrigger id={controlId} className="w-full">
						<SelectValue placeholder={field.placeholder ?? "Select…"} />
					</SelectTrigger>
					<SelectContent>
						{(field.options ?? []).map((opt) => (
							<SelectItem key={String(opt.value)} value={String(opt.value)}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			) : field.type === "json" ? (
				<Textarea
					id={controlId}
					value={
						typeof value === "string"
							? value
							: value == null
								? ""
								: JSON.stringify(value, null, 2)
					}
					onChange={(e) => {
						const raw = e.target.value;
						try {
							onChange(JSON.parse(raw) as unknown);
						} catch {
							onChange(raw);
						}
					}}
					disabled={disabled}
					rows={4}
					className="font-mono text-xs"
					placeholder={field.placeholder ?? "{}"}
				/>
			) : field.type === "number" ? (
				<Input
					id={controlId}
					type="number"
					value={value == null ? "" : String(value)}
					onChange={(e) => {
						const raw = e.target.value;
						if (raw === "") {
							onChange(undefined);
							return;
						}
						const n = Number(raw);
						onChange(Number.isFinite(n) ? n : raw);
					}}
					disabled={disabled}
					placeholder={field.placeholder}
				/>
			) : (
				<Input
					id={controlId}
					value={value == null ? "" : String(value)}
					onChange={(e) => onChange(e.target.value)}
					disabled={disabled}
					placeholder={field.placeholder}
				/>
			)}
		</div>
	);
}
