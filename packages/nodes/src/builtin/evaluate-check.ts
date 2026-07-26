import {
	type CheckOp,
	type ValueCheck,
	checkOpsNeedingValue,
} from "@quester-studio/schema";

export type NormalizedCheck = {
	path: string;
	op: CheckOp;
	value?: unknown;
};

export function normalizeValueCheck(check: ValueCheck): NormalizedCheck {
	const hasEquals = Object.hasOwn(check, "equals");
	const hasValue = Object.hasOwn(check, "value");

	if (check.op !== undefined) {
		if (!hasValue && check.op === "eq" && hasEquals) {
			return { path: check.path, op: "eq", value: check.equals };
		}
		if (hasValue) {
			return { path: check.path, op: check.op, value: check.value };
		}
		return { path: check.path, op: check.op };
	}

	if (hasEquals) {
		return { path: check.path, op: "eq", value: check.equals };
	}

	return { path: check.path, op: "truthy" };
}

function valuesEqual(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

function toNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "bigint") return Number(value);
	if (typeof value === "string" && value.trim() !== "") {
		const n = Number(value);
		if (Number.isFinite(n)) return n;
	}
	return null;
}

function compareOrdered(
	actual: unknown,
	expected: unknown,
	op: "gt" | "gte" | "lt" | "lte",
): boolean {
	const an = toNumber(actual);
	const en = toNumber(expected);
	if (an !== null && en !== null) {
		switch (op) {
			case "gt":
				return an > en;
			case "gte":
				return an >= en;
			case "lt":
				return an < en;
			case "lte":
				return an <= en;
		}
	}

	const as = String(actual);
	const es = String(expected);
	switch (op) {
		case "gt":
			return as > es;
		case "gte":
			return as >= es;
		case "lt":
			return as < es;
		case "lte":
			return as <= es;
	}
}

function containsValue(actual: unknown, expected: unknown): boolean {
	if (typeof actual === "string") {
		return actual.includes(String(expected));
	}
	if (Array.isArray(actual)) {
		return actual.some((item) => valuesEqual(item, expected));
	}
	return false;
}

function asString(value: unknown): string | null {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return null;
}

export type CheckEvalResult = { ok: true } | { ok: false; detail: string };

export function evaluateNormalizedCheck(
	actual: unknown,
	check: NormalizedCheck,
): CheckEvalResult {
	const { op, value } = check;

	if (checkOpsNeedingValue.has(op) && !Object.hasOwn(check, "value")) {
		return { ok: false, detail: `op "${op}" requires value` };
	}

	switch (op) {
		case "eq":
			return valuesEqual(actual, value)
				? { ok: true }
				: {
						ok: false,
						detail: `expected ${JSON.stringify(value)}, got ${JSON.stringify(actual)}`,
					};
		case "neq":
			return !valuesEqual(actual, value)
				? { ok: true }
				: {
						ok: false,
						detail: `expected not ${JSON.stringify(value)}`,
					};
		case "gt":
		case "gte":
		case "lt":
		case "lte":
			return compareOrdered(actual, value, op)
				? { ok: true }
				: {
						ok: false,
						detail: `expected ${op} ${JSON.stringify(value)}, got ${JSON.stringify(actual)}`,
					};
		case "contains":
			return containsValue(actual, value)
				? { ok: true }
				: {
						ok: false,
						detail: `expected to contain ${JSON.stringify(value)}, got ${JSON.stringify(actual)}`,
					};
		case "notContains":
			return !containsValue(actual, value)
				? { ok: true }
				: {
						ok: false,
						detail: `expected not to contain ${JSON.stringify(value)}`,
					};
		case "startsWith": {
			const s = asString(actual);
			const prefix = String(value);
			return s?.startsWith(prefix)
				? { ok: true }
				: {
						ok: false,
						detail: `expected to start with ${JSON.stringify(prefix)}, got ${JSON.stringify(actual)}`,
					};
		}
		case "endsWith": {
			const s = asString(actual);
			const suffix = String(value);
			return s?.endsWith(suffix)
				? { ok: true }
				: {
						ok: false,
						detail: `expected to end with ${JSON.stringify(suffix)}, got ${JSON.stringify(actual)}`,
					};
		}
		case "matches": {
			const s = asString(actual);
			if (s === null) {
				return {
					ok: false,
					detail: `expected string matching ${JSON.stringify(value)}, got ${JSON.stringify(actual)}`,
				};
			}
			let re: RegExp;
			try {
				re = new RegExp(String(value));
			} catch {
				return {
					ok: false,
					detail: `invalid regular expression ${JSON.stringify(value)}`,
				};
			}
			return re.test(s)
				? { ok: true }
				: {
						ok: false,
						detail: `expected to match ${JSON.stringify(value)}, got ${JSON.stringify(actual)}`,
					};
		}
		case "exists":
			return actual !== null && actual !== undefined
				? { ok: true }
				: { ok: false, detail: "expected value to exist" };
		case "truthy":
			return actual
				? { ok: true }
				: { ok: false, detail: "expected truthy value" };
		case "falsy":
			return !actual
				? { ok: true }
				: { ok: false, detail: "expected falsy value" };
	}
}

export function formatCheckFailure(
	path: string,
	result: Extract<CheckEvalResult, { ok: false }>,
): string {
	return `${path}: ${result.detail}`;
}
