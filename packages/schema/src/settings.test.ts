import { describe, expect, test } from "bun:test";
import { mergeHttpSettings } from "./settings.js";

describe("mergeHttpSettings", () => {
	test("merges headers with flow overriding workspace keys", () => {
		const merged = mergeHttpSettings(
			{ defaultHeaders: { Accept: "application/json", "X-Ws": "1" } },
			{ defaultHeaders: { "X-Flow": "2", Accept: "text/plain" } },
		);
		expect(merged.defaultHeaders).toEqual({
			Accept: "text/plain",
			"X-Ws": "1",
			"X-Flow": "2",
		});
	});

	test("flow timeout overrides workspace; 0 is preserved", () => {
		expect(
			mergeHttpSettings({ defaultHeaders: {}, timeoutMs: 5000 }, undefined)
				.timeoutMs,
		).toBe(5000);
		expect(
			mergeHttpSettings(
				{ defaultHeaders: {}, timeoutMs: 5000 },
				{ defaultHeaders: {}, timeoutMs: 0 },
			).timeoutMs,
		).toBe(0);
	});
});
