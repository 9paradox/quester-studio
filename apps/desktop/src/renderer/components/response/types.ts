export type StepView = {
	nodeId: string;
	type: string;
	input: unknown;
	output: unknown;
	error?: string;
};

export type HttpRequestSnapshot = {
	method: string;
	url: string;
	headers: Record<string, string>;
	body?: string;
};

export type HttpOutputShape = {
	status?: number;
	statusText?: string;
	headers?: Record<string, string>;
	body?: unknown;
	text?: string;
	request?: HttpRequestSnapshot;
	timing?: { durationMs: number; startedAt: number; endedAt: number };
	size?: number;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isHttpOutput(value: unknown): value is HttpOutputShape {
	return isRecord(value) && ("request" in value || "status" in value);
}

/** Split "Assertion failed: a; b" into individual failure messages. */
export function parseAssertFailures(error: string | undefined): string[] {
	if (!error) return [];
	const prefix = "Assertion failed: ";
	const idx = error.indexOf(prefix);
	const body = idx >= 0 ? error.slice(idx + prefix.length) : error;
	return body
		.split("; ")
		.map((s) => s.trim())
		.filter(Boolean);
}
