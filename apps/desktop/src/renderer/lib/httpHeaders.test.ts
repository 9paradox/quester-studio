import { describe, expect, test } from "bun:test";
import {
	commonHeaderValues,
	headerNameSuggestions,
	headerValueSuggestions,
} from "./httpHeaders.js";

describe("headerNameSuggestions", () => {
	test("filters by prefix", () => {
		expect(headerNameSuggestions("Cont").map((s) => s.label)).toEqual([
			"Content-Length",
			"Content-Type",
		]);
	});

	test("lists common names when empty", () => {
		expect(headerNameSuggestions("").length).toBeGreaterThan(5);
		expect(headerNameSuggestions("").map((s) => s.label)).toContain(
			"Authorization",
		);
	});
});

describe("headerValueSuggestions", () => {
	test("suggests content types for Content-Type", () => {
		expect(
			headerValueSuggestions("application/j", "Content-Type").map(
				(s) => s.label,
			),
		).toEqual(["application/json"]);
	});

	test("suggests bearer templates for Authorization", () => {
		const labels = headerValueSuggestions("", "Authorization").map(
			(s) => s.label,
		);
		expect(labels).toContain("Bearer {{secrets.API_TOKEN}}");
	});

	test("unknown header returns empty", () => {
		expect(headerValueSuggestions("", "X-Custom")).toEqual([]);
	});
});

describe("commonHeaderValues", () => {
	test("is case-insensitive", () => {
		expect(commonHeaderValues("content-type")).toEqual(
			commonHeaderValues("Content-Type"),
		);
	});
});
