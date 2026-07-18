import { describe, expect, test } from "bun:test";
import {
	findTemplateRanges,
	inputKeysFromJson,
	templateSuggestions,
	varKeysFromNodes,
} from "./templates.js";

describe("findTemplateRanges", () => {
	test("locates every template token", () => {
		const ranges = findTemplateRanges("{{env.API_BASE}}/users/{{input.id}}");
		expect(ranges).toHaveLength(2);
		expect(ranges[0]).toEqual({ from: 0, to: 16 });
		expect(ranges[1].from).toBe(23);
	});

	test("returns empty when no templates", () => {
		expect(findTemplateRanges("https://example.com")).toEqual([]);
	});
});

describe("inputKeysFromJson", () => {
	test("reads top-level object keys", () => {
		expect(inputKeysFromJson('{"a":1,"b":2}').sort()).toEqual(["a", "b"]);
	});

	test("ignores arrays and invalid json", () => {
		expect(inputKeysFromJson("[1,2]")).toEqual([]);
		expect(inputKeysFromJson("{ not json")).toEqual([]);
	});
});

describe("varKeysFromNodes", () => {
	test("collects variables from set nodes only", () => {
		const keys = varKeysFromNodes([
			{ type: "set", data: { variables: { token: "x", retries: 3 } } },
			{ type: "http", data: { url: "x" } },
			{ type: "set", data: { variables: { token: "y", user: "z" } } },
		]);
		expect(keys.sort()).toEqual(["retries", "token", "user"]);
	});
});

describe("templateSuggestions", () => {
	const ctx = {
		nodeIds: ["login", "profile"],
		inputKeys: ["username"],
		varKeys: ["token"],
	};

	test("suggests roots before a dot", () => {
		expect(templateSuggestions("", ctx).map((s) => s.label)).toEqual([
			"env",
			"input",
			"nodes",
			"vars",
		]);
	});

	test("suggests node ids after nodes.", () => {
		expect(templateSuggestions("nodes.lo", ctx).map((s) => s.label)).toEqual([
			"nodes.login",
			"nodes.profile",
		]);
	});

	test("suggests input and vars keys", () => {
		expect(templateSuggestions("input.", ctx).map((s) => s.label)).toEqual([
			"input.username",
		]);
		expect(templateSuggestions("vars.", ctx).map((s) => s.label)).toEqual([
			"vars.token",
		]);
	});
});
