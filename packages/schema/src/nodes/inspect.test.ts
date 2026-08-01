import { describe, expect, test } from "bun:test";
import { validateNodeData } from "../flow.js";
import { inspectNodeDataSchema } from "./inspect.js";

describe("inspectNodeDataSchema", () => {
	test("accepts optional expression", () => {
		expect(inspectNodeDataSchema.safeParse({}).success).toBe(true);
		expect(
			inspectNodeDataSchema.safeParse({ expression: "body.id" }).success,
		).toBe(true);
	});

	test("preview alias validates with inspect schema", () => {
		expect(validateNodeData("preview", { expression: "x" }).success).toBe(true);
	});
});
