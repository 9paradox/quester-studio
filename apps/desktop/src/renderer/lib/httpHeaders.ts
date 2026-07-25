/** Common HTTP header names for autocomplete in the Headers editor. */
export const COMMON_HEADER_NAMES = [
	"Accept",
	"Accept-Encoding",
	"Accept-Language",
	"Authorization",
	"Cache-Control",
	"Connection",
	"Content-Length",
	"Content-Type",
	"Cookie",
	"If-Match",
	"If-None-Match",
	"Origin",
	"Referer",
	"User-Agent",
	"X-API-Key",
	"X-Request-Id",
	"X-Requested-With",
] as const;

const CONTENT_TYPES = [
	"application/json",
	"application/xml",
	"application/x-www-form-urlencoded",
	"multipart/form-data",
	"text/plain",
	"text/html",
	"text/csv",
	"*/*",
];

/** Common values for a header name (case-insensitive). */
export function commonHeaderValues(headerName: string): string[] {
	switch (headerName.trim().toLowerCase()) {
		case "content-type":
			return [...CONTENT_TYPES];
		case "accept":
			return [...CONTENT_TYPES, "application/json, text/plain, */*"];
		case "authorization":
			return [
				"Bearer {{secrets.API_TOKEN}}",
				"Bearer ",
				"Basic ",
				"{{secrets.API_TOKEN}}",
			];
		case "cache-control":
			return ["no-cache", "no-store", "max-age=0", "private", "public"];
		case "connection":
			return ["keep-alive", "close"];
		case "content-length":
			return ["0"];
		case "x-requested-with":
			return ["XMLHttpRequest"];
		case "accept-encoding":
			return ["gzip", "gzip, deflate, br", "identity"];
		case "accept-language":
			return ["en", "en-US", "en-US,en;q=0.9"];
		default:
			return [];
	}
}

export type HeaderSuggestion = { label: string; detail: string };

/** Prefix-filtered header name suggestions. */
export function headerNameSuggestions(word: string): HeaderSuggestion[] {
	const prefix = word.trim().toLowerCase();
	return COMMON_HEADER_NAMES.filter((name) =>
		name.toLowerCase().startsWith(prefix),
	).map((label) => ({ label, detail: "header" }));
}

/** Prefix-filtered common values for the given header name. */
export function headerValueSuggestions(
	word: string,
	headerName: string,
): HeaderSuggestion[] {
	const prefix = word.trim().toLowerCase();
	return commonHeaderValues(headerName)
		.filter((value) => value.toLowerCase().startsWith(prefix))
		.map((label) => ({ label, detail: "common value" }));
}
