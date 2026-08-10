import { TemplateField } from "@/components/TemplateField.js";
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
import type { FormEditorTab } from "@/lib/editorTabs.js";
import type {
	FormFieldV1,
	FormSelectOption,
	FormV1,
} from "@quester-studio/schema";
import {
	IconChevronDown,
	IconChevronUp,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import {
	SettingsField,
	SettingsPageLayout,
	SettingsSection,
} from "./SettingsPageLayout.js";

const CATEGORIES = [
	{ id: "details", label: "Details" },
	{ id: "fields", label: "Fields" },
] as const;

const FIELD_TYPES = ["string", "number", "boolean", "json", "select"] as const;

type FieldType = (typeof FIELD_TYPES)[number];

type FormEditorProps = {
	tab: FormEditorTab;
	onChange: (form: FormV1) => void;
	onSave: () => void;
	canSave: boolean;
};

function nextFieldId(fields: FormFieldV1[]): string {
	const used = new Set(fields.map((f) => f.id));
	let n = fields.length + 1;
	let id = `field-${n}`;
	while (used.has(id)) {
		n += 1;
		id = `field-${n}`;
	}
	return id;
}

function changeFieldType(field: FormFieldV1, type: FieldType): FormFieldV1 {
	const base = {
		id: field.id,
		label: field.label,
		description: field.description,
		placeholder: field.placeholder,
		required: field.required,
		readonly: field.readonly,
		default: field.default,
	};
	if (type === "select") {
		return {
			...base,
			type: "select",
			options:
				field.type === "select" && field.options
					? field.options
					: [{ value: "", label: "Option" }],
			optionsFrom: field.type === "select" ? field.optionsFrom : undefined,
		};
	}
	return { ...base, type };
}

export function FormEditor({
	tab,
	onChange,
	onSave,
	canSave,
}: FormEditorProps) {
	const { form } = tab;
	const [category, setCategory] = useState<string>("details");

	const patchForm = (partial: Partial<FormV1>) => {
		onChange({ ...form, ...partial });
	};

	const updateField = (index: number, next: FormFieldV1) => {
		const fields = form.fields.map((f, i) => (i === index ? next : f));
		patchForm({ fields });
	};

	const moveField = (index: number, delta: number) => {
		const target = index + delta;
		if (target < 0 || target >= form.fields.length) return;
		const fields = [...form.fields];
		const [row] = fields.splice(index, 1);
		if (!row) return;
		fields.splice(target, 0, row);
		patchForm({ fields });
	};

	const removeField = (index: number) => {
		patchForm({ fields: form.fields.filter((_, i) => i !== index) });
	};

	const addField = () => {
		const field: FormFieldV1 = {
			id: nextFieldId(form.fields),
			type: "string",
			label: "New field",
		};
		patchForm({ fields: [...form.fields, field] });
	};

	return (
		<SettingsPageLayout
			title={form.name || form.id}
			categories={[...CATEGORIES]}
			activeCategory={category}
			onCategoryChange={setCategory}
			footer={
				<Button size="sm" disabled={!canSave} onClick={onSave}>
					Save
				</Button>
			}
		>
			{category === "details" ? (
				<SettingsSection title="Details">
					<SettingsField
						label="Name"
						htmlFor="form-name"
						description="Display name stored in the form file."
					>
						<Input
							id="form-name"
							value={form.name}
							onChange={(e) => patchForm({ name: e.target.value })}
							className="bg-background"
						/>
					</SettingsField>
					<SettingsField
						label="Description"
						htmlFor="form-description"
						description="Optional notes shown when the form awaits input."
					>
						<Textarea
							id="form-description"
							value={form.description ?? ""}
							onChange={(e) =>
								patchForm({
									description: e.target.value || undefined,
								})
							}
							rows={4}
							className="bg-background"
						/>
					</SettingsField>
					<p className="text-xs text-muted-foreground">
						Id:{" "}
						<code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
							{form.id}
						</code>
					</p>
				</SettingsSection>
			) : null}

			{category === "fields" ? (
				<SettingsSection title="Fields">
					<div className="flex flex-col gap-3">
						{form.fields.map((field, index) => (
							<FieldEditorCard
								key={`${field.id}-${index}`}
								field={field}
								index={index}
								total={form.fields.length}
								onChange={(next) => updateField(index, next)}
								onMoveUp={() => moveField(index, -1)}
								onMoveDown={() => moveField(index, 1)}
								onRemove={() => removeField(index)}
							/>
						))}
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="self-start"
							onClick={addField}
						>
							<IconPlus className="size-3.5" />
							Add field
						</Button>
						{form.fields.length === 0 ? (
							<p className="text-xs text-muted-foreground">
								No fields yet. Add at least one field for run-time prompts.
							</p>
						) : null}
					</div>
				</SettingsSection>
			) : null}
		</SettingsPageLayout>
	);
}

type FieldEditorCardProps = {
	field: FormFieldV1;
	index: number;
	total: number;
	onChange: (field: FormFieldV1) => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onRemove: () => void;
};

function FieldEditorCard({
	field,
	index,
	total,
	onChange,
	onMoveUp,
	onMoveDown,
	onRemove,
}: FieldEditorCardProps) {
	const optionsMode =
		field.type === "select" && field.optionsFrom ? "from" : "static";

	const patch = (partial: Partial<FormFieldV1>) => {
		onChange({ ...field, ...partial } as FormFieldV1);
	};

	return (
		<div className="flex flex-col gap-3 rounded-md border border-border/70 bg-muted/10 p-3">
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-medium text-muted-foreground">
					Field {index + 1}
				</span>
				<div className="flex items-center gap-0.5">
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						disabled={index === 0}
						onClick={onMoveUp}
						aria-label="Move field up"
					>
						<IconChevronUp className="size-3.5" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						disabled={index >= total - 1}
						onClick={onMoveDown}
						aria-label="Move field down"
					>
						<IconChevronDown className="size-3.5" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						onClick={onRemove}
						aria-label="Remove field"
					>
						<IconTrash className="size-3.5" />
					</Button>
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground">Id</Label>
					<Input
						value={field.id}
						onChange={(e) => patch({ id: e.target.value })}
						className="bg-background font-mono"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground">Type</Label>
					<Select
						value={field.type}
						onValueChange={(value) => {
							if (
								typeof value === "string" &&
								(FIELD_TYPES as readonly string[]).includes(value)
							) {
								onChange(changeFieldType(field, value as FieldType));
							}
						}}
					>
						<SelectTrigger className="w-full bg-background">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{FIELD_TYPES.map((type) => (
								<SelectItem key={type} value={type}>
									{type}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex flex-col gap-1.5 sm:col-span-2">
					<Label className="text-xs text-muted-foreground">Label</Label>
					<Input
						value={field.label ?? ""}
						onChange={(e) => patch({ label: e.target.value || undefined })}
						className="bg-background"
					/>
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground">Required</Label>
					<Select
						value={field.required ? "yes" : "no"}
						onValueChange={(value) => {
							if (value === "yes" || value === "no") {
								patch({ required: value === "yes" ? true : undefined });
							}
						}}
					>
						<SelectTrigger className="w-full bg-background">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="no">No</SelectItem>
							<SelectItem value="yes">Yes</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground">Readonly</Label>
					<Select
						value={field.readonly ? "yes" : "no"}
						onValueChange={(value) => {
							if (value === "yes" || value === "no") {
								patch({ readonly: value === "yes" ? true : undefined });
							}
						}}
					>
						<SelectTrigger className="w-full bg-background">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="no">No</SelectItem>
							<SelectItem value="yes">Yes</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs text-muted-foreground">Default</Label>
				{field.type === "string" || field.type === "select" ? (
					<TemplateField
						value={
							typeof field.default === "string"
								? field.default
								: field.default == null
									? ""
									: String(field.default)
						}
						onChange={(value) =>
							patch({ default: value === "" ? undefined : value })
						}
						placeholder="Static value or {{template}}"
					/>
				) : field.type === "boolean" ? (
					<Select
						value={
							field.default === true
								? "true"
								: field.default === false
									? "false"
									: "unset"
						}
						onValueChange={(value) => {
							if (value === "true") patch({ default: true });
							else if (value === "false") patch({ default: false });
							else patch({ default: undefined });
						}}
					>
						<SelectTrigger className="w-full bg-background">
							<SelectValue placeholder="Unset" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="unset">Unset</SelectItem>
							<SelectItem value="true">true</SelectItem>
							<SelectItem value="false">false</SelectItem>
						</SelectContent>
					</Select>
				) : (
					<Input
						value={
							field.default == null
								? ""
								: typeof field.default === "string"
									? field.default
									: JSON.stringify(field.default)
						}
						onChange={(e) => {
							const raw = e.target.value;
							if (raw === "") {
								patch({ default: undefined });
								return;
							}
							if (field.type === "number") {
								const n = Number(raw);
								patch({ default: Number.isFinite(n) ? n : raw });
								return;
							}
							try {
								patch({ default: JSON.parse(raw) as unknown });
							} catch {
								patch({ default: raw });
							}
						}}
						className="bg-background font-mono"
						placeholder={field.type === "json" ? "{}" : "0"}
					/>
				)}
			</div>

			{field.type === "select" ? (
				<div className="flex flex-col gap-3 border-t border-border/60 pt-3">
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground">
							Options source
						</Label>
						<Select
							value={optionsMode}
							onValueChange={(value) => {
								if (value === "static") {
									onChange({
										...field,
										type: "select",
										options: field.options ?? [{ value: "", label: "Option" }],
										optionsFrom: undefined,
									});
								} else if (value === "from") {
									onChange({
										...field,
										type: "select",
										options: undefined,
										optionsFrom: field.optionsFrom ?? {
											items: "{{nodes.list}}",
											value: "id",
											label: "name",
										},
									});
								}
							}}
						>
							<SelectTrigger className="w-full bg-background">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="static">Static options</SelectItem>
								<SelectItem value="from">
									From template (optionsFrom)
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{optionsMode === "static" ? (
						<StaticOptionsEditor
							options={field.options ?? []}
							onChange={(options) =>
								onChange({
									...field,
									type: "select",
									options,
									optionsFrom: undefined,
								})
							}
						/>
					) : (
						<div className="grid gap-3">
							<div className="flex flex-col gap-1.5">
								<Label className="text-xs text-muted-foreground">
									Items template
								</Label>
								<TemplateField
									value={field.optionsFrom?.items ?? ""}
									onChange={(items) =>
										onChange({
											...field,
											type: "select",
											options: undefined,
											optionsFrom: {
												items,
												value: field.optionsFrom?.value ?? "id",
												label: field.optionsFrom?.label ?? "name",
											},
										})
									}
									placeholder="{{nodes.list.body.items}}"
								/>
							</div>
							<div className="grid gap-3 sm:grid-cols-2">
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs text-muted-foreground">
										Value key
									</Label>
									<Input
										value={field.optionsFrom?.value ?? ""}
										onChange={(e) =>
											onChange({
												...field,
												type: "select",
												options: undefined,
												optionsFrom: {
													items: field.optionsFrom?.items ?? "",
													value: e.target.value,
													label: field.optionsFrom?.label ?? "name",
												},
											})
										}
										className="bg-background font-mono"
									/>
								</div>
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs text-muted-foreground">
										Label key
									</Label>
									<Input
										value={field.optionsFrom?.label ?? ""}
										onChange={(e) =>
											onChange({
												...field,
												type: "select",
												options: undefined,
												optionsFrom: {
													items: field.optionsFrom?.items ?? "",
													value: field.optionsFrom?.value ?? "id",
													label: e.target.value,
												},
											})
										}
										className="bg-background font-mono"
									/>
								</div>
							</div>
						</div>
					)}
				</div>
			) : null}
		</div>
	);
}

function StaticOptionsEditor({
	options,
	onChange,
}: {
	options: FormSelectOption[];
	onChange: (options: FormSelectOption[]) => void;
}) {
	const update = (index: number, patch: Partial<FormSelectOption>) => {
		onChange(
			options.map((opt, i) => (i === index ? { ...opt, ...patch } : opt)),
		);
	};

	return (
		<div className="flex flex-col gap-2">
			{options.map((opt, index) => (
				<div
					key={`${String(opt.value)}:${opt.label}:${index}`}
					className="flex items-end gap-2"
				>
					<div className="flex min-w-0 flex-1 flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground">Value</Label>
						<Input
							value={String(opt.value)}
							onChange={(e) => update(index, { value: e.target.value })}
							className="bg-background font-mono"
						/>
					</div>
					<div className="flex min-w-0 flex-1 flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground">Label</Label>
						<Input
							value={opt.label}
							onChange={(e) => update(index, { label: e.target.value })}
							className="bg-background"
						/>
					</div>
					{options.length > 1 ? (
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							onClick={() => onChange(options.filter((_, i) => i !== index))}
							aria-label="Remove option"
						>
							<IconTrash className="size-3.5" />
						</Button>
					) : null}
				</div>
			))}
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="self-start"
				onClick={() => onChange([...options, { value: "", label: "Option" }])}
			>
				<IconPlus className="size-3.5" />
				Add option
			</Button>
		</div>
	);
}
