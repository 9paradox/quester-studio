import { describe, expect, test } from "bun:test";
import { validateNodeData } from "../flow.js";

describe("note node data", () => {
	test("accepts text, fontSize, and optional label", () => {
		expect(
			validateNodeData("note", {
				label: "Tip",
				text: "Check env",
				fontSize: 16,
			}).success,
		).toBe(true);
	});

	test("defaults missing text and fontSize", () => {
		const result = validateNodeData("note", {});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({ text: "", fontSize: 12 });
		}
	});

	test("rejects fontSize outside allowed range", () => {
		expect(validateNodeData("note", { fontSize: 9 }).success).toBe(false);
		expect(validateNodeData("note", { fontSize: 49 }).success).toBe(false);
	});
});
