import { describe, expect, test } from "bun:test";
import { pathFromSegments, stringifyJson } from "./JsonViewer.js";

describe("stringifyJson", () => {
	test("pretty-prints objects", () => {
		expect(stringifyJson({ a: 1 })).toBe('{\n  "a": 1\n}');
	});

	test("handles primitives", () => {
		expect(stringifyJson("hi")).toBe('"hi"');
		expect(stringifyJson(null)).toBe("null");
		expect(stringifyJson(true)).toBe("true");
	});
});

describe("pathFromSegments", () => {
	test("matches JMESPath-style paths", () => {
		expect(pathFromSegments(["body", "user", "id"])).toBe("body.user.id");
		expect(pathFromSegments(["items", 0, "name"])).toBe("items[0].name");
	});
});
