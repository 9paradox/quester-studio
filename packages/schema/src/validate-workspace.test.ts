import { describe, expect, test } from "bun:test";
import { validateWorkspace } from "./validate-workspace.js";

describe("validateWorkspace", () => {
	test("accepts a valid manifest", () => {
		const result = validateWorkspace({
			name: "demo",
			version: "v1",
			flowsDir: "flows",
			environmentsDir: "environments",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe("demo");
		}
	});

	test("rejects missing name", () => {
		const result = validateWorkspace({ version: "v1" });
		expect(result.success).toBe(false);
	});

	test("rejects wrong version", () => {
		const result = validateWorkspace({ name: "demo", version: "v2" });
		expect(result.success).toBe(false);
	});
});
