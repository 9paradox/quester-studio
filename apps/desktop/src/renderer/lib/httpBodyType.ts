export const HTTP_BODY_TYPES = ["json", "xml", "html", "text"] as const;

export type HttpBodyType = (typeof HTTP_BODY_TYPES)[number];

export type HttpBodyTypeOption = {
	id: HttpBodyType;
	label: string;
	contentType: string;
	placeholder: string;
};

export const HTTP_BODY_TYPE_OPTIONS: readonly HttpBodyTypeOption[] = [
	{
		id: "json",
		label: "JSON",
		contentType: "application/json",
		placeholder: '{\n  "key": "{{input.key}}"\n}',
	},
	{
		id: "xml",
		label: "XML",
		contentType: "application/xml",
		placeholder: "<root>\n  <key>{{input.key}}</key>\n</root>",
	},
	{
		id: "html",
		label: "HTML",
		contentType: "text/html",
		placeholder: "<p>{{input.message}}</p>",
	},
	{
		id: "text",
		label: "Text",
		contentType: "text/plain",
		placeholder: "{{input.message}}",
	},
] as const;

const MANAGED_CONTENT_TYPES = new Set(
	HTTP_BODY_TYPE_OPTIONS.map((o) => o.contentType),
);

/** Infer body editor mode from a Content-Type header value. */
export function inferBodyType(contentType: string | undefined): HttpBodyType {
	if (!contentType) return "json";
	const lower = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
	if (lower.includes("json") || lower.endsWith("+json")) return "json";
	if (lower.includes("xml") || lower.endsWith("+xml")) return "xml";
	if (lower.includes("html")) return "html";
	if (lower.startsWith("text/")) return "text";
	return "json";
}

export function bodyTypeOption(type: HttpBodyType): HttpBodyTypeOption {
	const found = HTTP_BODY_TYPE_OPTIONS.find((o) => o.id === type);
	if (!found) {
		throw new Error(`Unknown body type: ${type}`);
	}
	return found;
}

/**
 * Update headers when the body type dropdown changes.
 * Sets Content-Type for known body modes; leaves custom Content-Types alone
 * unless they were previously a managed body type.
 */
export function headersForBodyType(
	headers: Record<string, string>,
	type: HttpBodyType,
): Record<string, string> {
	const option = bodyTypeOption(type);
	const next = { ...headers };
	const existingKey = Object.keys(next).find(
		(k) => k.toLowerCase() === "content-type",
	);
	const existing = existingKey ? next[existingKey] : undefined;
	const existingBase = existing?.split(";")[0]?.trim().toLowerCase();

	if (
		existingKey &&
		existingBase &&
		!MANAGED_CONTENT_TYPES.has(existingBase) &&
		!existingBase.includes("json") &&
		!existingBase.includes("xml") &&
		!existingBase.includes("html") &&
		existingBase !== "text/plain"
	) {
		return next;
	}

	if (existingKey && existingKey !== "Content-Type") {
		delete next[existingKey];
	}
	next["Content-Type"] = option.contentType;
	return next;
}
