import { describe, expect, test } from "bun:test";
import { templateNodeDataSchema } from "./template.js";

describe("templateNodeDataSchema", () => {
	test("defaults mode to eta when omitted", () => {
		const parsed = templateNodeDataSchema.parse({ template: "Hi {{input.x}}" });
		expect(parsed.mode).toBe("eta");
	});

	test("accepts mode safe and eta", () => {
		expect(
			templateNodeDataSchema.safeParse({
				template: "x",
				mode: "safe",
			}).success,
		).toBe(true);
		expect(
			templateNodeDataSchema.safeParse({
				template: "x",
				mode: "eta",
			}).success,
		).toBe(true);
	});

	test("rejects unknown mode", () => {
		expect(
			templateNodeDataSchema.safeParse({
				template: "x",
				mode: "vm",
			}).success,
		).toBe(false);
	});
});
