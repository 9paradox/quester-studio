import { describe, expect, test } from "bun:test";
import { assertNodeDataSchema } from "./assert.js";
import { valueCheckSchema } from "./check.js";
import { ifNodeDataSchema } from "./if.js";

describe("valueCheckSchema", () => {
	test("accepts legacy equals and bare path", () => {
		expect(valueCheckSchema.safeParse({ path: "ok" }).success).toBe(true);
		expect(
			valueCheckSchema.safeParse({ path: "status", equals: 200 }).success,
		).toBe(true);
	});

	test("accepts ops with value", () => {
		expect(
			valueCheckSchema.safeParse({
				path: "status",
				op: "gte",
				value: 200,
			}).success,
		).toBe(true);
		expect(
			valueCheckSchema.safeParse({
				path: "body.msg",
				op: "contains",
				value: "ok",
			}).success,
		).toBe(true);
	});

	test("rejects ops that need value when missing", () => {
		expect(
			valueCheckSchema.safeParse({ path: "status", op: "gte" }).success,
		).toBe(false);
	});

	test("accepts exists without value", () => {
		expect(
			valueCheckSchema.safeParse({ path: "body.id", op: "exists" }).success,
		).toBe(true);
	});
});

describe("assert / if node data", () => {
	test("assert requires checks", () => {
		expect(assertNodeDataSchema.safeParse({ checks: [] }).success).toBe(false);
		expect(
			assertNodeDataSchema.safeParse({
				checks: [{ path: "status", op: "eq", value: 200 }],
			}).success,
		).toBe(true);
	});

	test("if requires condition or checks", () => {
		expect(ifNodeDataSchema.safeParse({}).success).toBe(false);
		expect(ifNodeDataSchema.safeParse({ condition: "true" }).success).toBe(
			true,
		);
		expect(
			ifNodeDataSchema.safeParse({
				checks: [{ path: "status", op: "lt", value: 400 }],
			}).success,
		).toBe(true);
	});
});
