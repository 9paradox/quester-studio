import { stringifyJson } from "@/components/JsonViewer.js";

/**
 * Pretty-print response body for Raw viewers when the payload is JSON.
 * Prefers structured `body` over wire `text` (often minified).
 * Non-JSON text is returned unchanged.
 */
export function formatResponseRawText(body: unknown, text?: string): string {
	if (body !== undefined && body !== null) {
		if (typeof body === "string") {
			const trimmed = body.trim();
			if (!trimmed) return body;
			try {
				return stringifyJson(JSON.parse(body));
			} catch {
				return body;
			}
		}
		return stringifyJson(body);
	}

	if (text !== undefined && text !== "") {
		try {
			return stringifyJson(JSON.parse(text));
		} catch {
			return text;
		}
	}

	return "";
}
