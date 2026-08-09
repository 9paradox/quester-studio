import { describe, expect, test } from "bun:test";
import {
	FOREACH_MAX_CONCURRENCY,
	FOREACH_MAX_ITEMS_CEILING,
	foreachNodeDataSchema,
} from "./foreach.js";

describe("foreachNodeDataSchema", () => {
	test("accepts items with defaults", () => {
		const parsed = foreachNodeDataSchema.parse({ items: "items" });
		expect(parsed.maxItems).toBe(100);
		expect(parsed.itemVar).toBeUndefined();
	});

	test("accepts concurrency and itemVar", () => {
		expect(
			foreachNodeDataSchema.safeParse({
				items: "{{input.ids}}",
				concurrency: 4,
				maxItems: 50,
				itemVar: "row",
			}).success,
		).toBe(true);
	});

	test("rejects legacy map field", () => {
		expect(
			foreachNodeDataSchema.safeParse({
				items: "items",
				map: "id",
			}).success,
		).toBe(false);
	});

	test("rejects maxItems above security ceiling", () => {
		expect(
			foreachNodeDataSchema.safeParse({
				items: "items",
				maxItems: FOREACH_MAX_ITEMS_CEILING + 1,
			}).success,
		).toBe(false);
		expect(
			foreachNodeDataSchema.safeParse({
				items: "items",
				maxItems: FOREACH_MAX_ITEMS_CEILING,
			}).success,
		).toBe(true);
	});

	test("rejects concurrency above security ceiling", () => {
		expect(
			foreachNodeDataSchema.safeParse({
				items: "items",
				concurrency: FOREACH_MAX_CONCURRENCY + 1,
			}).success,
		).toBe(false);
	});

	test("requires items", () => {
		expect(foreachNodeDataSchema.safeParse({}).success).toBe(false);
	});
});
