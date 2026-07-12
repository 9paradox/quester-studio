import { describe, expect, test } from "bun:test";
import { stringifyJson } from "./JsonViewer.js";

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
