import {
	mkdir,
	readFile,
	readdir,
	stat,
	unlink,
	writeFile,
} from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import {
	type RequestV1,
	type WorkspaceV1,
	validateRequest,
} from "@quester/schema";

export type RequestMeta = {
	/** Relative path without `.request.json`, e.g. `Auth/login`. */
	path: string;
	id: string;
	name: string;
	/** Parent folder under collectionsDir, or empty for root. */
	collection: string;
};

async function readJson(path: string): Promise<unknown> {
	const raw = await readFile(path, "utf8");
	return JSON.parse(raw) as unknown;
}

function toPosix(path: string): string {
	return path.split(sep).join("/");
}

async function walkRequestFiles(dir: string, out: string[]): Promise<void> {
	let entries: string[];
	try {
		entries = await readdir(dir);
	} catch {
		return;
	}
	for (const entry of entries) {
		const full = join(dir, entry);
		const info = await stat(full).catch(() => null);
		if (!info) continue;
		if (info.isDirectory()) {
			await walkRequestFiles(full, out);
			continue;
		}
		if (entry.endsWith(".request.json")) {
			out.push(full);
		}
	}
}

async function walkCollectionDirs(
	dir: string,
	root: string,
	out: string[],
): Promise<void> {
	let entries: string[];
	try {
		entries = await readdir(dir);
	} catch {
		return;
	}
	for (const entry of entries) {
		const full = join(dir, entry);
		const info = await stat(full).catch(() => null);
		if (!info?.isDirectory()) continue;
		out.push(toPosix(relative(root, full)));
		await walkCollectionDirs(full, root, out);
	}
}

export function requestPathFromFile(
	filePath: string,
	collectionsRoot: string,
): string {
	const rel = toPosix(relative(collectionsRoot, filePath));
	return rel.replace(/\.request\.json$/i, "");
}

export function requestFileFromPath(
	collectionsRoot: string,
	requestPath: string,
): string {
	const normalized = requestPath.replace(/\\/g, "/").replace(/^\/+/, "");
	if (
		normalized.includes("..") ||
		normalized.split("/").some((p) => p === "")
	) {
		throw new Error(`Invalid request path: ${requestPath}`);
	}
	return join(collectionsRoot, `${normalized}.request.json`);
}

export async function listRequests(
	root: string,
	manifest: WorkspaceV1,
): Promise<RequestMeta[]> {
	const collectionsRoot = join(root, manifest.collectionsDir);
	const files: string[] = [];
	await walkRequestFiles(collectionsRoot, files);
	const metas: RequestMeta[] = [];
	for (const file of files) {
		try {
			const data = await readJson(file);
			const parsed = validateRequest(data);
			if (!parsed.success) continue;
			const path = requestPathFromFile(file, collectionsRoot);
			const slash = path.lastIndexOf("/");
			metas.push({
				path,
				id: parsed.data.id,
				name: parsed.data.name,
				collection: slash >= 0 ? path.slice(0, slash) : "",
			});
		} catch {
			// skip invalid
		}
	}
	return metas.sort((a, b) => a.path.localeCompare(b.path));
}

/** Relative folder paths under collectionsDir (includes empty folders). */
export async function listCollectionFolders(
	root: string,
	manifest: WorkspaceV1,
): Promise<string[]> {
	const collectionsRoot = join(root, manifest.collectionsDir);
	const folders: string[] = [];
	await walkCollectionDirs(collectionsRoot, collectionsRoot, folders);
	return folders.sort((a, b) => a.localeCompare(b));
}

export async function loadRequest(
	root: string,
	manifest: WorkspaceV1,
	requestPath: string,
): Promise<RequestV1> {
	const file = requestFileFromPath(
		join(root, manifest.collectionsDir),
		requestPath,
	);
	const data = await readJson(file);
	const parsed = validateRequest(data);
	if (!parsed.success) {
		throw new Error(`Invalid request ${requestPath}: ${parsed.error}`);
	}
	return parsed.data;
}

export async function saveRequest(
	root: string,
	manifest: WorkspaceV1,
	requestPath: string,
	request: RequestV1,
): Promise<RequestV1> {
	const parsed = validateRequest(request);
	if (!parsed.success) throw new Error(parsed.error);
	const file = requestFileFromPath(
		join(root, manifest.collectionsDir),
		requestPath,
	);
	await mkdir(dirname(file), { recursive: true });
	await writeFile(file, `${JSON.stringify(parsed.data, null, 2)}\n`, "utf8");
	return parsed.data;
}

export async function deleteRequest(
	root: string,
	manifest: WorkspaceV1,
	requestPath: string,
): Promise<void> {
	const file = requestFileFromPath(
		join(root, manifest.collectionsDir),
		requestPath,
	);
	await unlink(file);
}

export async function ensureCollectionsDir(
	root: string,
	manifest: WorkspaceV1,
): Promise<void> {
	await mkdir(join(root, manifest.collectionsDir), { recursive: true });
}
