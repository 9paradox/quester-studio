import { describe, expect, test } from "bun:test";
import {
	assertCheckMode,
	formatAssertCheckSummary,
	normalizeAssertChecks,
	setAssertCheckMode,
} from "../components/AssertChecksEditor.js";

describe("assert checks helpers", () => {
	test("normalizeAssertChecks fills a minimal valid check", () => {
		expect(normalizeAssertChecks(undefined)).toEqual([{ path: "ok" }]);
		expect(normalizeAssertChecks([])).toEqual([{ path: "ok" }]);
	});

	test("preserves equals including falsy values", () => {
		const checks = normalizeAssertChecks([
			{ path: "status", equals: 0 },
			{ path: "body.ok", equals: false },
			{ path: "body.name", equals: null },
			{ path: "body.id" },
		]);
		expect(checks).toEqual([
			{ path: "status", equals: 0 },
			{ path: "body.ok", equals: false },
			{ path: "body.name", equals: null },
			{ path: "body.id" },
		]);
		const truthy = checks[3];
		expect(truthy).toBeDefined();
		if (!truthy) return;
		expect(assertCheckMode(truthy)).toBe("truthy");
	});

	test("setAssertCheckMode toggles equals presence", () => {
		const withEquals = setAssertCheckMode({ path: "status" }, "equals");
		expect(withEquals).toEqual({ path: "status", equals: null });
		expect(setAssertCheckMode(withEquals, "truthy")).toEqual({
			path: "status",
		});
	});

	test("formatAssertCheckSummary shows first check and remainder", () => {
		expect(formatAssertCheckSummary([{ path: "status", equals: 200 }])).toBe(
			"status = 200",
		);
		expect(
			formatAssertCheckSummary([
				{ path: "ok" },
				{ path: "status", equals: 200 },
			]),
		).toBe("ok (truthy) +1 more");
	});
});
