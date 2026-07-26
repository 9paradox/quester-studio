import {
	type CheckOp,
	checkOps,
	checkOpsNeedingValue,
} from "@quester-studio/schema";

export type AssertCheck = {
	path: string;
	op?: CheckOp;
	value?: unknown;
	/** @deprecated Prefer `op: "eq"` + `value`. */
	equals?: unknown;
};

export type AssertCheckMode = CheckOp;

const OP_LABELS: Record<CheckOp, string> = {
	eq: "Equals",
	neq: "Not equals",
	gt: "Greater than",
	gte: "Greater or equal",
	lt: "Less than",
	lte: "Less or equal",
	contains: "Contains",
	notContains: "Not contains",
	startsWith: "Starts with",
	endsWith: "Ends with",
	matches: "Matches (regex)",
	exists: "Exists",
	truthy: "Truthy",
	falsy: "Falsy",
};

export function checkOpLabel(op: CheckOp): string {
	return OP_LABELS[op];
}

export function checkOpNeedsValue(op: CheckOp): boolean {
	return checkOpsNeedingValue.has(op);
}

export const assertCheckModes: readonly CheckOp[] = checkOps;

export function assertCheckMode(check: AssertCheck): AssertCheckMode {
	if (check.op !== undefined) return check.op;
	if (Object.hasOwn(check, "equals")) return "eq";
	return "truthy";
}

export function assertCheckValue(check: AssertCheck): unknown {
	if (Object.hasOwn(check, "value")) return check.value;
	if (Object.hasOwn(check, "equals")) return check.equals;
	return null;
}

export function setAssertCheckMode(
	check: AssertCheck,
	mode: AssertCheckMode,
): AssertCheck {
	const path = check.path || "ok";
	if (!checkOpNeedsValue(mode)) {
		return { path, op: mode };
	}
	const value = assertCheckValue(check);
	return { path, op: mode, value };
}

export function normalizeAssertChecks(
	value: unknown,
	options?: { allowEmpty?: boolean },
): AssertCheck[] {
	if (!Array.isArray(value) || value.length === 0) {
		return options?.allowEmpty ? [] : [{ path: "ok", op: "truthy" }];
	}
	return value.map((item) => {
		if (typeof item !== "object" || item === null || Array.isArray(item)) {
			return { path: "ok", op: "truthy" };
		}
		const row = item as Record<string, unknown>;
		const path = typeof row.path === "string" ? row.path : "ok";

		if (
			typeof row.op === "string" &&
			(checkOps as readonly string[]).includes(row.op)
		) {
			const op = row.op as CheckOp;
			if (checkOpNeedsValue(op)) {
				if (Object.hasOwn(row, "value")) {
					return { path, op, value: row.value };
				}
				if (op === "eq" && Object.hasOwn(row, "equals")) {
					return { path, op, value: row.equals };
				}
				return { path, op, value: null };
			}
			return { path, op };
		}

		if (Object.hasOwn(row, "equals")) {
			return { path, op: "eq", value: row.equals };
		}
		return { path, op: "truthy" };
	});
}

export function formatAssertCheckSummary(checks: AssertCheck[]): string {
	if (checks.length === 0) return "No checks";
	const first = checks[0];
	if (!first) return "No checks";
	const op = assertCheckMode(first);
	const head = checkOpNeedsValue(op)
		? `${first.path} ${op} ${summarizeEquals(assertCheckValue(first))}`
		: `${first.path} (${op})`;
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
