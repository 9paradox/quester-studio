import { describe, expect, test } from "bun:test";
import { parseRawHeaders, stringifyRawHeaders } from "./rawHeaders.js";

describe("raw headers", () => {
	test("serializes headers as Name: value lines", () => {
		expect(
			stringifyRawHeaders({
				"Content-Type": "application/json",
				Authorization: "Bearer {{env.TOKEN}}",
			}),
		).toBe(
			"Content-Type: application/json\nAuthorization: Bearer {{env.TOKEN}}",
		);
	});

	test("parses values containing additional colons", () => {
		expect(
			parseRawHeaders(
				"Content-Type: application/json\nX-Callback: https://example.com:8443/a",
			),
		).toEqual({
			headers: {
				"Content-Type": "application/json",
				"X-Callback": "https://example.com:8443/a",
			},
			error: null,
		});
	});

	test("ignores blank lines and allows empty values", () => {
		expect(parseRawHeaders("\nX-Empty:\n\n")).toEqual({
			headers: { "X-Empty": "" },
			error: null,
		});
	});

	test("reports malformed lines", () => {
		expect(parseRawHeaders("Content-Type application/json")).toEqual({
			headers: null,
			error: 'Line 1 must use "Name: value" format',
		});
	});
});
