import { describe, expect, test } from "bun:test";
import { DEFAULT_INPUT } from "./runDefaults.js";

describe("DEFAULT_INPUT", () => {
	test("is neutral empty JSON object", () => {
		expect(JSON.parse(DEFAULT_INPUT)).toEqual({});
		expect(DEFAULT_INPUT).not.toContain("emilys");
		expect(DEFAULT_INPUT).not.toContain("password");
	});
});
