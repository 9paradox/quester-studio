import { describe, expect, test } from "bun:test";
import { highlightTemplateSegments } from "./TemplateField.js";

describe("highlightTemplateSegments", () => {
	test("wraps template tokens", () => {
		const nodes = highlightTemplateSegments(
			"{{env.API_BASE}}/users/{{input.id}}",
		);
		expect(nodes.length).toBeGreaterThanOrEqual(3);
	});

	test("returns plain text when no templates", () => {
		const nodes = highlightTemplateSegments("https://example.com");
		expect(nodes).toHaveLength(1);
	});
});
