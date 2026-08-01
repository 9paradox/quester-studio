import { describe, expect, test } from "bun:test";
import { subflowNodeDataSchema } from "./subflow.js";

describe("subflowNodeDataSchema", () => {
	test("accepts flowId", () => {
		expect(
			subflowNodeDataSchema.safeParse({ flowId: "login-and-profile" }).success,
		).toBe(true);
	});

	test("accepts templated input map", () => {
		expect(
			subflowNodeDataSchema.safeParse({
				flowId: "child",
				input: { userId: "{{input.id}}" },
			}).success,
		).toBe(true);
	});

	test("requires flowId", () => {
		expect(subflowNodeDataSchema.safeParse({}).success).toBe(false);
	});
});
