import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	type FormV1,
	type WorkspaceV1,
	isSafeWorkspaceFileId,
	validateForm,
} from "@quester-studio/schema";

export type FormMeta = {
	id: string;
	name: string;
};

function formsRoot(root: string, manifest: WorkspaceV1): string {
	return join(root, manifest.formsDir ?? "forms");
}

function formFilePath(
	root: string,
	manifest: WorkspaceV1,
	formId: string,
): string {
	if (!isSafeWorkspaceFileId(formId)) {
		throw new Error(`Unsafe form id: ${formId}`);
	}
	return join(formsRoot(root, manifest), `${formId}.form.json`);
}

async function readJson(path: string): Promise<unknown> {
	const raw = await readFile(path, "utf8");
	return JSON.parse(raw) as unknown;
}

export async function listForms(
	root: string,
	manifest: WorkspaceV1,
): Promise<FormMeta[]> {
	const dir = formsRoot(root, manifest);
	let entries: string[];
	try {
		entries = await readdir(dir);
	} catch {
		return [];
	}
	const out: FormMeta[] = [];
	for (const entry of entries) {
		if (!entry.endsWith(".form.json")) continue;
		const id = entry.replace(/\.form\.json$/i, "");
		if (!isSafeWorkspaceFileId(id)) continue;
		try {
			const raw = await readJson(join(dir, entry));
			const validated = validateForm(raw);
			if (validated.success) {
				out.push({ id: validated.data.id, name: validated.data.name });
			} else {
				out.push({ id, name: id });
			}
		} catch {
			out.push({ id, name: id });
		}
	}
	out.sort((a, b) => a.id.localeCompare(b.id));
	return out;
}

export async function loadForm(
	root: string,
	manifest: WorkspaceV1,
	formId: string,
): Promise<FormV1> {
	const filePath = formFilePath(root, manifest, formId);
	const raw = await readJson(filePath);
	const validated = validateForm(raw);
	if (!validated.success) {
		throw new Error(`Invalid form ${formId}: ${validated.error}`);
	}
	if (validated.data.id !== formId) {
		throw new Error(
			`Form id mismatch: file ${formId}.form.json has id "${validated.data.id}"`,
		);
	}
	return validated.data;
}

export async function saveForm(
	root: string,
	manifest: WorkspaceV1,
	form: FormV1,
): Promise<FormV1> {
	const validated = validateForm(form);
	if (!validated.success) throw new Error(validated.error);
	const dir = formsRoot(root, manifest);
	await mkdir(dir, { recursive: true });
	const filePath = formFilePath(root, manifest, validated.data.id);
	await writeFile(
		filePath,
		`${JSON.stringify(validated.data, null, 2)}\n`,
		"utf8",
	);
	return validated.data;
}

export async function createForm(
	root: string,
	manifest: WorkspaceV1,
	formId: string,
	name?: string,
): Promise<FormV1> {
	if (!isSafeWorkspaceFileId(formId)) {
		throw new Error(`Unsafe form id: ${formId}`);
	}
	const existing = await listForms(root, manifest);
	if (existing.some((f) => f.id === formId)) {
		throw new Error(`Form already exists: ${formId}`);
	}
	const form: FormV1 = {
		version: "v1",
		id: formId,
		name: name ?? formId,
		fields: [],
	};
	return saveForm(root, manifest, form);
}

export async function deleteForm(
	root: string,
	manifest: WorkspaceV1,
	formId: string,
): Promise<void> {
	const filePath = formFilePath(root, manifest, formId);
	await unlink(filePath);
}

export async function renameForm(
	root: string,
	manifest: WorkspaceV1,
	formId: string,
	newId: string,
	name?: string,
): Promise<FormV1> {
	if (!isSafeWorkspaceFileId(newId)) {
		throw new Error(`Unsafe form id: ${newId}`);
	}
	if (formId !== newId) {
		const existing = await listForms(root, manifest);
		if (existing.some((f) => f.id === newId)) {
			throw new Error(`Form already exists: ${newId}`);
		}
	}
	const form = await loadForm(root, manifest, formId);
	const next: FormV1 = {
		...form,
		id: newId,
		name: name ?? form.name,
	};
	await saveForm(root, manifest, next);
	if (formId !== newId) {
		await unlink(formFilePath(root, manifest, formId));
	}
	return next;
}
