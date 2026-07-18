import { describe, expect, test } from "bun:test";
import { headersForBodyType, inferBodyType } from "./httpBodyType.js";

describe("inferBodyType", () => {
	test("defaults to json when missing", () => {
		expect(inferBodyType(undefined)).toBe("json");
		expect(inferBodyType("")).toBe("json");
	});

	test("maps common content types", () => {
		expect(inferBodyType("application/json")).toBe("json");
		expect(inferBodyType("application/json; charset=utf-8")).toBe("json");
		expect(inferBodyType("application/vnd.api+json")).toBe("json");
		expect(inferBodyType("application/xml")).toBe("xml");
		expect(inferBodyType("text/xml")).toBe("xml");
		expect(inferBodyType("text/html; charset=utf-8")).toBe("html");
		expect(inferBodyType("text/plain")).toBe("text");
	});
});

describe("headersForBodyType", () => {
	test("sets Content-Type for managed body modes", () => {
		expect(headersForBodyType({}, "xml")).toEqual({
			"Content-Type": "application/xml",
		});
		expect(
			headersForBodyType({ "Content-Type": "application/json" }, "text"),
		).toEqual({ "Content-Type": "text/plain" });
	});

	test("normalizes casing of existing Content-Type key", () => {
		expect(
			headersForBodyType({ "content-type": "text/plain" }, "json"),
		).toEqual({ "Content-Type": "application/json" });
	});

	test("preserves custom Content-Type values", () => {
		expect(
			headersForBodyType(
				{ "Content-Type": "multipart/form-data; boundary=x" },
				"json",
			),
		).toEqual({ "Content-Type": "multipart/form-data; boundary=x" });
	});
});
