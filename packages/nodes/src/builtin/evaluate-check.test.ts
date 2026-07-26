import { describe, expect, test } from "bun:test";
import {
	evaluateNormalizedCheck,
	normalizeValueCheck,
} from "./evaluate-check.js";

describe("normalizeValueCheck", () => {
	test("legacy equals becomes eq", () => {
		expect(normalizeValueCheck({ path: "status", equals: 200 })).toEqual({
			path: "status",
			op: "eq",
			value: 200,
		});
	});

	test("bare path becomes truthy", () => {
		expect(normalizeValueCheck({ path: "ok" })).toEqual({
			path: "ok",
			op: "truthy",
		});
	});

	test("op + value passes through", () => {
		expect(
			normalizeValueCheck({ path: "status", op: "gte", value: 200 }),
		).toEqual({ path: "status", op: "gte", value: 200 });
	});
});

describe("evaluateNormalizedCheck", () => {
	test("eq / neq", () => {
		expect(
			evaluateNormalizedCheck(200, { path: "s", op: "eq", value: 200 }).ok,
		).toBe(true);
		expect(
			evaluateNormalizedCheck(500, { path: "s", op: "eq", value: 200 }).ok,
		).toBe(false);
		expect(
			evaluateNormalizedCheck(500, { path: "s", op: "neq", value: 200 }).ok,
		).toBe(true);
	});

	test("numeric comparisons", () => {
		expect(
			evaluateNormalizedCheck(201, { path: "s", op: "gt", value: 200 }).ok,
		).toBe(true);
		expect(
			evaluateNormalizedCheck(200, { path: "s", op: "gte", value: 200 }).ok,
		).toBe(true);
		expect(
			evaluateNormalizedCheck(199, { path: "s", op: "lt", value: 200 }).ok,
		).toBe(true);
		expect(
			evaluateNormalizedCheck("404", { path: "s", op: "lte", value: 500 }).ok,
		).toBe(true);
	});

	test("contains / startsWith / endsWith / matches", () => {
		expect(
			evaluateNormalizedCheck("hello world", {
				path: "m",
				op: "contains",
				value: "lo w",
			}).ok,
		).toBe(true);
		expect(
			evaluateNormalizedCheck(["a", "b"], {
				path: "m",
				op: "contains",
				value: "b",
			}).ok,
		).toBe(true);
		expect(
			evaluateNormalizedCheck("Bearer xyz", {
				path: "m",
				op: "startsWith",
				value: "Bearer ",
			}).ok,
		).toBe(true);
		expect(
			evaluateNormalizedCheck("file.json", {
				path: "m",
				op: "endsWith",
				value: ".json",
			}).ok,
		).toBe(true);
		expect(
			evaluateNormalizedCheck("user_42", {
				path: "m",
				op: "matches",
				value: "^user_\\d+$",
			}).ok,
		).toBe(true);
	});

	test("exists / truthy / falsy", () => {
		expect(evaluateNormalizedCheck(0, { path: "x", op: "exists" }).ok).toBe(
			true,
		);
		expect(evaluateNormalizedCheck(null, { path: "x", op: "exists" }).ok).toBe(
			false,
		);
		expect(evaluateNormalizedCheck("ok", { path: "x", op: "truthy" }).ok).toBe(
			true,
		);
		expect(evaluateNormalizedCheck(0, { path: "x", op: "truthy" }).ok).toBe(
			false,
		);
		expect(evaluateNormalizedCheck(0, { path: "x", op: "falsy" }).ok).toBe(
			true,
		);
	});
});
