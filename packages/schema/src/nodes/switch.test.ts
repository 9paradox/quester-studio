import { describe, expect, test } from "bun:test";
import { switchNodeDataSchema } from "./switch.js";

describe("switchNodeDataSchema", () => {
	test("accepts expression with cases", () => {
		expect(
			switchNodeDataSchema.safeParse({
				expression: "{{input.status}}",
				cases: [{ value: "ok", handle: "success" }],
			}).success,
		).toBe(true);
	});

	test("accepts path with cases", () => {
		expect(
			switchNodeDataSchema.safeParse({
				path: "status",
				cases: [{ value: "200", handle: "ok" }],
				defaultHandle: "fallback",
			}).success,
		).toBe(true);
	});

	test("requires expression or path", () => {
		expect(
			switchNodeDataSchema.safeParse({
				cases: [{ value: "a", handle: "a" }],
			}).success,
		).toBe(false);
	});

	test("requires at least one case", () => {
		expect(
			switchNodeDataSchema.safeParse({
				expression: "x",
				cases: [],
			}).success,
		).toBe(false);
	});
});
