export type RawHeadersResult =
	| { headers: Record<string, string>; error: null }
	| { headers: null; error: string };

/** Serialize headers as one `Name: value` entry per line. */
export function stringifyRawHeaders(headers: Record<string, string>): string {
	return Object.entries(headers)
		.map(([name, value]) => `${name}: ${value}`)
		.join("\n");
}

/** Parse one `Name: value` header per line, splitting on the first colon. */
export function parseRawHeaders(raw: string): RawHeadersResult {
	const headers: Record<string, string> = {};
	const lines = raw.split(/\r?\n/);

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? "";
		if (!line.trim()) continue;

		const separator = line.indexOf(":");
		if (separator <= 0) {
			return {
				headers: null,
				error: `Line ${index + 1} must use "Name: value" format`,
			};
		}

		const name = line.slice(0, separator).trim();
		if (!name) {
			return {
				headers: null,
				error: `Line ${index + 1} is missing a header name`,
			};
		}

		headers[name] = line.slice(separator + 1).trim();
	}

	return { headers, error: null };
}
