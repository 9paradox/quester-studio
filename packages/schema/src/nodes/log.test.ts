import { describe, expect, test } from "bun:test";
import { validateNodeData } from "../flow.js";
import { logNodeDataSchema } from "./log.js";

describe("logNodeDataSchema", () => {
	test("accepts message with optional label", () => {
		expect(logNodeDataSchema.safeParse({ message: "hello" }).success).toBe(
			true,
		);
		expect(
			logNodeDataSchema.safeParse({ label: "Step", message: "{{input.id}}" })
				.success,
		).toBe(true);
	});

	test("rejects empty message", () => {
		expect(logNodeDataSchema.safeParse({ message: "" }).success).toBe(false);
	});

	test("validates via validateNodeData", () => {
		expect(validateNodeData("log", { message: "ok" }).success).toBe(true);
	});
});
