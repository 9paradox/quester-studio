import { describe, expect, test } from "bun:test";
import { validateNodeData } from "../flow.js";

describe("note node data", () => {
	test("accepts text and optional label", () => {
		expect(
			validateNodeData("note", { label: "Tip", text: "Check env" }).success,
		).toBe(true);
	});

	test("defaults missing text to empty string", () => {
		const result = validateNodeData("note", {});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({ text: "" });
		}
	});
});
