import { describe, expect, test } from "bun:test";
import { formatResponseRawText } from "./formatResponseRaw.js";

describe("formatResponseRawText", () => {
	test("pretty-prints object body over minified text", () => {
		const body = { id: 1, title: "x" };
		const text = '{"id":1,"title":"x"}';
		expect(formatResponseRawText(body, text)).toBe(
			'{\n  "id": 1,\n  "title": "x"\n}',
		);
	});

	test("pretty-prints minified JSON text when body is missing", () => {
		expect(formatResponseRawText(undefined, '{"a":1}')).toBe('{\n  "a": 1\n}');
	});

	test("leaves non-JSON text unchanged", () => {
		expect(formatResponseRawText(undefined, "not json")).toBe("not json");
	});

	test("pretty-prints JSON string body", () => {
		expect(formatResponseRawText('{"ok":true}')).toBe('{\n  "ok": true\n}');
	});
});
