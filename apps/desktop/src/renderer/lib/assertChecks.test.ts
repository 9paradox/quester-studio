import { describe, expect, test } from "bun:test";
import {
	assertCheckMode,
	formatAssertCheckSummary,
	normalizeAssertChecks,
	setAssertCheckMode,
} from "./assertChecks.js";

describe("assert checks helpers", () => {
	test("normalizeAssertChecks fills a minimal valid check", () => {
		expect(normalizeAssertChecks(undefined)).toEqual([
			{ path: "ok", op: "truthy" },
		]);
		expect(normalizeAssertChecks([])).toEqual([{ path: "ok", op: "truthy" }]);
	});

	test("normalizeAssertChecks preserves empty draft paths", () => {
		expect(normalizeAssertChecks([{ path: "" }])).toEqual([
			{ path: "", op: "truthy" },
		]);
		expect(normalizeAssertChecks([{ path: "", equals: 1 }])).toEqual([
			{ path: "", op: "eq", value: 1 },
		]);
	});

	test("preserves equals including falsy values as eq", () => {
		const checks = normalizeAssertChecks([
			{ path: "status", equals: 0 },
			{ path: "body.ok", equals: false },
			{ path: "body.name", equals: null },
			{ path: "body.id" },
		]);
		expect(checks).toEqual([
			{ path: "status", op: "eq", value: 0 },
			{ path: "body.ok", op: "eq", value: false },
			{ path: "body.name", op: "eq", value: null },
			{ path: "body.id", op: "truthy" },
		]);
		const truthy = checks[3];
		expect(truthy).toBeDefined();
		if (!truthy) return;
		expect(assertCheckMode(truthy)).toBe("truthy");
	});

	test("normalizes op + value", () => {
		expect(
			normalizeAssertChecks([{ path: "status", op: "gte", value: 200 }]),
		).toEqual([{ path: "status", op: "gte", value: 200 }]);
	});

	test("setAssertCheckMode toggles ops", () => {
		const withEq = setAssertCheckMode({ path: "status" }, "eq");
		expect(withEq).toEqual({ path: "status", op: "eq", value: null });
		expect(setAssertCheckMode(withEq, "truthy")).toEqual({
			path: "status",
			op: "truthy",
		});
		expect(setAssertCheckMode(withEq, "contains")).toEqual({
			path: "status",
			op: "contains",
			value: null,
		});
	});

	test("formatAssertCheckSummary shows first check and remainder", () => {
		expect(
			formatAssertCheckSummary([{ path: "status", op: "eq", value: 200 }]),
		).toBe("status eq 200");
		expect(
			formatAssertCheckSummary([
				{ path: "ok", op: "truthy" },
				{ path: "status", op: "eq", value: 200 },
			]),
		).toBe("ok (truthy) +1 more");
	});
});
