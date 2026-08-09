import { describe, expect, test } from "bun:test";
import {
	nextSwitchCaseHandle,
	normalizeSwitchCases,
} from "./SwitchCasesEditor.js";

describe("normalizeSwitchCases", () => {
	test("defaults when empty or invalid", () => {
		expect(normalizeSwitchCases(undefined)).toEqual([
			{ value: "ok", handle: "success" },
		]);
		expect(normalizeSwitchCases([])).toEqual([
			{ value: "ok", handle: "success" },
		]);
	});

	test("keeps valid rows", () => {
		expect(
			normalizeSwitchCases([
				{ value: "a", handle: "alpha" },
				{ value: "b", handle: "beta" },
			]),
		).toEqual([
			{ value: "a", handle: "alpha" },
			{ value: "b", handle: "beta" },
		]);
	});
});

describe("nextSwitchCaseHandle", () => {
	test("avoids colliding with existing handles", () => {
		expect(
			nextSwitchCaseHandle([
				{ value: "a", handle: "case-1" },
				{ value: "b", handle: "case-2" },
			]),
		).toBe("case-3");
		expect(nextSwitchCaseHandle([{ value: "a", handle: "success" }])).toBe(
			"case-2",
		);
	});
});
