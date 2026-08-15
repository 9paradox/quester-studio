export const HTTP_AUTH_HEADERS_VAR = "httpAuthHeaders";
export const HTTP_AUTH_QUERY_VAR = "httpAuthQuery";

export function asStringRecord(value: unknown): Record<string, string> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
		if (typeof v === "string") out[k] = v;
	}
	return out;
}

export function mergeAuthVars(
	vars: Record<string, unknown>,
	patch: {
		headers?: Record<string, string>;
		query?: Record<string, string>;
	},
): Record<string, unknown> {
	const headers = {
		...asStringRecord(vars[HTTP_AUTH_HEADERS_VAR]),
		...patch.headers,
	};
	const query = {
		...asStringRecord(vars[HTTP_AUTH_QUERY_VAR]),
		...patch.query,
	};
	return {
		...vars,
		[HTTP_AUTH_HEADERS_VAR]: headers,
		[HTTP_AUTH_QUERY_VAR]: query,
	};
}

export function setHeaderCaseInsensitive(
	headers: Record<string, string>,
	name: string,
	value: string,
): void {
	const lower = name.toLowerCase();
	for (const key of Object.keys(headers)) {
		if (key.toLowerCase() === lower) delete headers[key];
	}
	headers[name] = value;
}

/** Auth query first; existing URL search params win. */
export function applyAuthQuery(
	url: string,
	query: Record<string, string>,
): string {
	const entries = Object.entries(query);
	if (entries.length === 0) return url;
	const parsed = new URL(url);
	const existing = new URLSearchParams(parsed.search);
	const merged = new URLSearchParams();
	for (const [k, v] of entries) {
		merged.set(k, v);
	}
	existing.forEach((v, k) => {
		merged.set(k, v);
	});
	parsed.search = merged.toString();
	return parsed.toString();
}
