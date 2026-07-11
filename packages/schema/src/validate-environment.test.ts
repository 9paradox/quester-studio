import { describe, expect, test } from "bun:test";
import { validateEnvironment } from "./validate-environment.js";

describe("validateEnvironment", () => {
	test("accepts a valid environment", () => {
		const result = validateEnvironment({
			name: "local",
			version: "v1",
			variables: { API_BASE: "https://example.com", RETRIES: 3, DEBUG: true },
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.variables.API_BASE).toBe("https://example.com");
		}
	});

	test("defaults variables to empty object", () => {
		const result = validateEnvironment({ name: "local", version: "v1" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.variables).toEqual({});
		}
	});

	test("rejects invalid variable types", () => {
		const result = validateEnvironment({
			name: "local",
			version: "v1",
			variables: { bad: { nested: true } },
		});
		expect(result.success).toBe(false);
	});
});
