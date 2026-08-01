import { describe, expect, test } from "bun:test";
import { tryNodeDataSchema } from "./try.js";

describe("tryNodeDataSchema", () => {
	test("accepts condition", () => {
		expect(
			tryNodeDataSchema.safeParse({ condition: "{{input.ok}}" }).success,
		).toBe(true);
	});

	test("accepts checks", () => {
		expect(
			tryNodeDataSchema.safeParse({
				checks: [{ path: "status", op: "gte", value: 200 }],
			}).success,
		).toBe(true);
	});

	test("requires condition or checks", () => {
		expect(tryNodeDataSchema.safeParse({}).success).toBe(false);
	});
});
