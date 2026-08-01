import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { REQUEST_VERSION, type RequestV1 } from "@quester-studio/schema";
import {
	ensureCollectionsDir,
	listRequests,
	saveRequest,
} from "./collections.js";
import { loadWorkspace } from "./workspace.js";

const HTTP_METHODS = new Set([
	"GET",
	"POST",
	"PUT",
	"PATCH",
	"DELETE",
	"HEAD",
	"OPTIONS",
]);

export type ImportCollectionResult = {
	imported: string[];
	skipped: string[];
};

type PostmanHeader = { key?: string; value?: string; disabled?: boolean };
type PostmanUrl =
	| string
	| {
			raw?: string;
			protocol?: string;
			host?: string | string[];
			path?: string | string[];
	  };
type PostmanBody = { mode?: string; raw?: string };
type PostmanRequest = {
	method?: string;
	header?: PostmanHeader[];
	url?: PostmanUrl;
	body?: PostmanBody;
};
type PostmanItem = {
	name?: string;
	item?: PostmanItem[];
	request?: PostmanRequest;
};
type PostmanCollection = {
	info?: { name?: string; schema?: string };
	item?: PostmanItem[];
};

function slugifySegment(raw: string): string {
	const slug = raw
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug || "request";
}

function normalizeMethod(method: string | undefined): RequestV1["method"] {
	const upper = (method ?? "GET").toUpperCase();
	if (HTTP_METHODS.has(upper)) {
		return upper as RequestV1["method"];
	}
	return "GET";
}

function resolvePostmanUrl(url: PostmanUrl | undefined): string {
	if (!url) return "https://example.com";
	if (typeof url === "string") return url.trim() || "https://example.com";
	if (url.raw?.trim()) return url.raw.trim();
	const protocol = url.protocol?.replace(/:$/, "") || "https";
	const hostPart = Array.isArray(url.host)
		? url.host.join(".")
		: (url.host ?? "");
	const pathPart = Array.isArray(url.path)
		? url.path.join("/")
		: (url.path ?? "");
	if (!hostPart && !pathPart) return "https://example.com";
	if (/^https?:\/\//i.test(hostPart)) {
		return pathPart ? `${hostPart}/${pathPart}` : hostPart;
	}
	const base = hostPart
		? `${protocol}://${hostPart}`
		: `${protocol}://example.com`;
	return pathPart ? `${base}/${pathPart}` : base;
}

function parseHeaders(
	headers: PostmanHeader[] | undefined,
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const header of headers ?? []) {
		if (header.disabled) continue;
		const key = header.key?.trim();
		if (!key) continue;
		out[key] = header.value ?? "";
	}
	return out;
}

function parseBody(
	body: PostmanBody | undefined,
): string | Record<string, unknown> | undefined {
	if (!body?.raw?.trim()) return undefined;
	const raw = body.raw.trim();
	if (body.mode && body.mode !== "raw") return raw;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (
			parsed !== null &&
			typeof parsed === "object" &&
			!Array.isArray(parsed)
		) {
			return parsed as Record<string, unknown>;
		}
	} catch {
		// keep raw string
	}
	return raw;
}

function isPostmanCollection(data: unknown): data is PostmanCollection {
	if (!data || typeof data !== "object") return false;
	const obj = data as PostmanCollection;
	if (!Array.isArray(obj.item)) return false;
	const schema = obj.info?.schema ?? "";
	if (schema.includes("v2.0") || schema.includes("v2.1")) return true;
	// Accept collections without schema when they look like Postman v2.x.
	return obj.item.some(
		(entry) => Boolean(entry.request) || Array.isArray(entry.item),
	);
}

function collectRequests(
	items: PostmanItem[] | undefined,
	prefix: string,
	out: { name: string; pathPrefix: string; request: PostmanRequest }[],
): void {
	for (const item of items ?? []) {
		const segment = slugifySegment(item.name ?? "request");
		const pathPrefix = prefix ? `${prefix}/${segment}` : segment;
		if (item.request) {
			out.push({
				name: item.name?.trim() || segment,
				pathPrefix,
				request: item.request,
			});
		}
		if (item.item?.length) {
			collectRequests(item.item, pathPrefix, out);
		}
	}
}

function uniqueRequestPath(base: string, used: Set<string>): string {
	if (!used.has(base)) {
		used.add(base);
		return base;
	}
	let n = 2;
	while (used.has(`${base}-${n}`)) n += 1;
	const next = `${base}-${n}`;
	used.add(next);
	return next;
}

function toRequestV1(
	name: string,
	requestPath: string,
	req: PostmanRequest,
): RequestV1 {
	const id = requestPath.includes("/")
		? (requestPath.split("/").pop() ?? requestPath)
		: requestPath;
	const parsed: RequestV1 = {
		version: REQUEST_VERSION,
		id,
		name,
		method: normalizeMethod(req.method),
		url: resolvePostmanUrl(req.url),
		headers: parseHeaders(req.header),
	};
	const body = parseBody(req.body);
	if (body !== undefined) parsed.body = body;
	return parsed;
}

export async function importPostmanCollectionFile(
	workspaceRoot: string,
	collectionFile: string,
): Promise<ImportCollectionResult> {
	const absFile = resolve(collectionFile);
	const raw = JSON.parse(await readFile(absFile, "utf8")) as unknown;
	if (!isPostmanCollection(raw)) {
		throw new Error(
			"Unsupported collection format — expected Postman Collection v2.1 JSON",
		);
	}
	return importPostmanCollection(workspaceRoot, raw);
}

export async function importPostmanCollection(
	workspaceRoot: string,
	collection: PostmanCollection,
): Promise<ImportCollectionResult> {
	const root = resolve(workspaceRoot);
	const ws = await loadWorkspace(root);
	await ensureCollectionsDir(root, ws.manifest);

	const collectionRoot = slugifySegment(collection.info?.name ?? "imported");
	const entries: {
		name: string;
		pathPrefix: string;
		request: PostmanRequest;
	}[] = [];
	collectRequests(collection.item, collectionRoot, entries);

	const existing = new Set(
		(await listRequests(root, ws.manifest)).map((r) => r.path),
	);
	const used = new Set(existing);
	const imported: string[] = [];
	const skipped: string[] = [];

	for (const entry of entries) {
		const requestPath = uniqueRequestPath(entry.pathPrefix, used);
		if (existing.has(entry.pathPrefix) && requestPath !== entry.pathPrefix) {
			skipped.push(entry.pathPrefix);
		}
		const request = toRequestV1(entry.name, requestPath, entry.request);
		await saveRequest(root, ws.manifest, requestPath, request);
		imported.push(requestPath);
	}

	return { imported, skipped };
}
