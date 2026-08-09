import { describe, expect, test } from "bun:test";
import { tryNodeDataSchema } from "./try.js";

describe("tryNodeDataSchema", () => {
	test("accepts empty / label-only framed try", () => {
		expect(tryNodeDataSchema.safeParse({}).success).toBe(true);
		expect(tryNodeDataSchema.safeParse({ label: "Guard" }).success).toBe(true);
	});

	test("rejects legacy soft condition", () => {
		const r = tryNodeDataSchema.safeParse({ condition: "{{input.ok}}" });
		expect(r.success).toBe(false);
	});

	test("rejects legacy soft checks", () => {
		const r = tryNodeDataSchema.safeParse({
			checks: [{ path: "status", op: "gte", value: 200 }],
		});
		expect(r.success).toBe(false);
	});
});
