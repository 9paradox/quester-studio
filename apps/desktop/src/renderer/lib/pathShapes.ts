/** Learned JSON path shapes for autocomplete (paths/keys only — never values). */

export const PATH_SHAPE_MAX_DEPTH = 8;
export const PATH_SHAPE_MAX_PATHS_PER_SOURCE = 2000;
export const PATH_SHAPE_INDEX_MAX_ENTRIES = 5000;

export type PathShapeEntry = {
	paths: string[];
	lastSeen: number;
};

/** Source key → observed paths (e.g. `nodes.login`, `collection.auth/login`). */
export type PathShapeIndex = Record<string, PathShapeEntry>;

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Format one path segment for JMESPath / template dot paths. */
export function formatPathSegment(key: string | number): string {
	if (typeof key === "number") return `[${key}]`;
	if (IDENT.test(key)) return key;
	const escaped = key.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
	return `"${escaped}"`;
}

/** Join segments into a dotted path (`body.user.id`, `items[0].id`). */
export function joinPathSegments(segments: Array<string | number>): string {
	let out = "";
	for (const seg of segments) {
		if (typeof seg === "number") {
			out += `[${seg}]`;
			continue;
		}
		const formatted = formatPathSegment(seg);
		if (!out) {
			out = formatted;
		} else if (formatted.startsWith('"')) {
			out += `.${formatted}`;
		} else {
			out += `.${formatted}`;
		}
	}
	return out;
}

export type CollectJsonPathsOptions = {
	maxDepth?: number;
	maxPaths?: number;
	/** Skip string leaves longer than this (avoid indexing huge bodies as paths). */
	maxStringLeafLength?: number;
};

/**
 * Walk a JSON value and collect relative paths to every object key / array index.
 * Root primitives yield `[]`. Caps depth and total paths for performance.
 * JSON object/array encoded as a string (common template output) is parsed first.
 */
export function collectJsonPaths(
	value: unknown,
	opts: CollectJsonPathsOptions = {},
): string[] {
	const root = coerceJsonContainer(value);
	const maxDepth = opts.maxDepth ?? PATH_SHAPE_MAX_DEPTH;
	const maxPaths = opts.maxPaths ?? PATH_SHAPE_MAX_PATHS_PER_SOURCE;
	const maxStringLeafLength = opts.maxStringLeafLength ?? 10_000;
	const paths: string[] = [];
	const seen = new Set<string>();

	const add = (path: string) => {
		if (!path || seen.has(path) || paths.length >= maxPaths) return;
		seen.add(path);
		paths.push(path);
	};

	const walk = (
		node: unknown,
		segments: Array<string | number>,
		depth: number,
	) => {
		if (paths.length >= maxPaths) return;
		if (depth > maxDepth) return;

		if (node === null || typeof node !== "object") {
			if (segments.length > 0) add(joinPathSegments(segments));
			return;
		}

		if (Array.isArray(node)) {
			if (segments.length > 0) add(joinPathSegments(segments));
			const limit = Math.min(node.length, 20);
			for (let i = 0; i < limit; i++) {
				walk(node[i], [...segments, i], depth + 1);
			}
			return;
		}

		const obj = node as Record<string, unknown>;
		const keys = Object.keys(obj);
		if (segments.length > 0) add(joinPathSegments(segments));
		for (const key of keys) {
			if (paths.length >= maxPaths) break;
			const child = obj[key];
			if (
				typeof child === "string" &&
				child.length > maxStringLeafLength &&
				segments.length === 0
			) {
				add(formatPathSegment(key));
				continue;
			}
			walk(child, [...segments, key], depth + 1);
		}
	};

	walk(root, [], 0);
	return paths;
}

/** Parse a string root when it is a JSON object or array (template/http text). */
function coerceJsonContainer(value: unknown): unknown {
	if (typeof value !== "string") return value;
	const trimmed = value.trim();
	if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return value;
	try {
		return JSON.parse(trimmed) as unknown;
	} catch {
		return value;
	}
}

/** Merge paths for a source key; bump lastSeen; LRU-trim global entry count. */
export function mergePathShapes(
	index: PathShapeIndex,
	sourceKey: string,
	paths: readonly string[],
	now = Date.now(),
): PathShapeIndex {
	const existing = index[sourceKey];
	const merged = new Set<string>(existing?.paths ?? []);
	for (const p of paths) {
		if (p) merged.add(p);
	}
	const nextPaths = [...merged].slice(0, PATH_SHAPE_MAX_PATHS_PER_SOURCE);
	const next: PathShapeIndex = {
		...index,
		[sourceKey]: { paths: nextPaths, lastSeen: now },
	};
	return trimPathShapeIndex(next);
}

/** Keep at most PATH_SHAPE_INDEX_MAX_ENTRIES sources (oldest lastSeen dropped). */
export function trimPathShapeIndex(index: PathShapeIndex): PathShapeIndex {
	const entries = Object.entries(index);
	if (entries.length <= PATH_SHAPE_INDEX_MAX_ENTRIES) return index;
	entries.sort((a, b) => b[1].lastSeen - a[1].lastSeen);
	const kept = entries.slice(0, PATH_SHAPE_INDEX_MAX_ENTRIES);
	return Object.fromEntries(kept);
}

export function pathsForSource(
	index: PathShapeIndex,
	sourceKey: string,
): string[] {
	return index[sourceKey]?.paths ?? [];
}

/** Persistable document shape. */
export type PathShapesFileV1 = {
	version: 1;
	updatedAt: number;
	sources: PathShapeIndex;
};

export function emptyPathShapeIndex(): PathShapeIndex {
	return {};
}

export function serializePathShapes(index: PathShapeIndex): PathShapesFileV1 {
	return {
		version: 1,
		updatedAt: Date.now(),
		sources: index,
	};
}

/** Parse disk JSON; returns empty index on failure. */
export function parsePathShapes(raw: unknown): PathShapeIndex {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
		return emptyPathShapeIndex();
	}
	const doc = raw as Record<string, unknown>;
	const sources = doc.sources;
	if (!sources || typeof sources !== "object" || Array.isArray(sources)) {
		return emptyPathShapeIndex();
	}
	const out: PathShapeIndex = {};
	for (const [key, entry] of Object.entries(
		sources as Record<string, unknown>,
	)) {
		if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
		const e = entry as Record<string, unknown>;
		const paths = Array.isArray(e.paths)
			? e.paths.filter(
					(p): p is string => typeof p === "string" && p.length > 0,
				)
			: [];
		const lastSeen = typeof e.lastSeen === "number" ? e.lastSeen : 0;
		if (paths.length === 0) continue;
		out[key] = {
			paths: paths.slice(0, PATH_SHAPE_MAX_PATHS_PER_SOURCE),
			lastSeen,
		};
	}
	return trimPathShapeIndex(out);
}

/** Build `{{nodes.id.path}}` or bare JMESPath for clipboard. */
export function formatTemplateNodePath(
	nodeId: string,
	relativePath: string,
): string {
	const path = relativePath.trim();
	return path ? `{{nodes.${nodeId}.${path}}}` : `{{nodes.${nodeId}}}`;
}

export function nodeSourceKey(nodeId: string): string {
	return `nodes.${nodeId}`;
}

export function collectionSourceKey(requestPath: string): string {
	return `collection.${requestPath}`;
}

export function scheduleIdle(fn: () => void): void {
	const ric = (
		globalThis as typeof globalThis & {
			requestIdleCallback?: (
				cb: () => void,
				opts?: { timeout: number },
			) => number;
		}
	).requestIdleCallback;
	if (typeof ric === "function") {
		ric(fn, { timeout: 2000 });
		return;
	}
	setTimeout(fn, 0);
}
