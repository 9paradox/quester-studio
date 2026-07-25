export type AssertCheck = {
	path: string;
	equals?: unknown;
};

export type AssertCheckMode = "truthy" | "equals";

export function assertCheckMode(check: AssertCheck): AssertCheckMode {
	return "equals" in check ? "equals" : "truthy";
}

export function setAssertCheckMode(
	check: AssertCheck,
	mode: AssertCheckMode,
): AssertCheck {
	if (mode === "truthy") {
		return { path: check.path || "ok" };
	}
	if ("equals" in check) return check;
	return { ...check, equals: null };
}

export function normalizeAssertChecks(value: unknown): AssertCheck[] {
	if (!Array.isArray(value) || value.length === 0) {
		return [{ path: "ok" }];
	}
	return value.map((item) => {
		if (typeof item !== "object" || item === null || Array.isArray(item)) {
			return { path: "ok" };
		}
		const row = item as Record<string, unknown>;
		const path = typeof row.path === "string" && row.path ? row.path : "ok";
		if ("equals" in row) return { path, equals: row.equals };
		return { path };
	});
}

export function formatAssertCheckSummary(checks: AssertCheck[]): string {
	if (checks.length === 0) return "No checks";
	const first = checks[0];
	if (!first) return "No checks";
	const head =
		assertCheckMode(first) === "equals"
			? `${first.path} = ${summarizeEquals(first.equals)}`
			: `${first.path} (truthy)`;
	if (checks.length === 1) return head;
	return `${head} +${checks.length - 1} more`;
}

function summarizeEquals(value: unknown): string {
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	if (value === null) return "null";
	try {
		const text = JSON.stringify(value);
		return text.length > 24 ? `${text.slice(0, 21)}…` : text;
	} catch {
		return "…";
	}
}
