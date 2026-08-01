import { describe, expect, test } from "bun:test";
import { validateNodeData } from "../flow.js";
import { delayNodeDataSchema } from "./delay.js";

describe("delayNodeDataSchema", () => {
	test("accepts ms with optional jitter", () => {
		expect(delayNodeDataSchema.safeParse({ ms: 1000 }).success).toBe(true);
		expect(
			delayNodeDataSchema.safeParse({ ms: 500, jitterMs: 200 }).success,
		).toBe(true);
	});

	test("rejects negative ms", () => {
		expect(delayNodeDataSchema.safeParse({ ms: -1 }).success).toBe(false);
	});

	test("wait alias validates with delay schema", () => {
		expect(validateNodeData("wait", { ms: 0 }).success).toBe(true);
	});
});
