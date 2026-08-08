/** Parse JSON object/array strings; leave plain text as-is. */
export function coerceJsonValue(value: unknown): unknown {
	if (typeof value !== "string") return value;
	const trimmed = value.trim();
	if (!trimmed) return value;
	try {
		return JSON.parse(trimmed) as unknown;
	} catch {
		return value;
	}
}
