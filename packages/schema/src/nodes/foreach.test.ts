import { describe, expect, test } from "bun:test";
import { foreachNodeDataSchema } from "./foreach.js";

describe("foreachNodeDataSchema", () => {
	test("accepts items with defaults", () => {
		const parsed = foreachNodeDataSchema.parse({ items: "items" });
		expect(parsed.maxItems).toBe(100);
		expect(parsed.itemVar).toBeUndefined();
	});

	test("accepts optional map and concurrency", () => {
		expect(
			foreachNodeDataSchema.safeParse({
				items: "{{input.ids}}",
				map: "id",
				concurrency: 4,
				maxItems: 50,
				itemVar: "row",
			}).success,
		).toBe(true);
	});

	test("requires items", () => {
		expect(foreachNodeDataSchema.safeParse({}).success).toBe(false);
	});
});
