import { describe, expect, test } from "bun:test";
import { builtinNodeTypes } from "@quester-studio/schema";
import { getNodePlugin, listNodePlugins } from "./registry.js";
import "./index.js";

describe("node registry", () => {
	test("registers all built-in plugins", () => {
		for (const type of builtinNodeTypes) {
			expect(getNodePlugin(type)).toBeDefined();
		}
		expect(listNodePlugins()).toHaveLength(builtinNodeTypes.length);
	});

	test("resolves wait alias to delay plugin", () => {
		expect(getNodePlugin("wait")).toBe(getNodePlugin("delay"));
	});

	test("resolves preview alias to inspect plugin", () => {
		expect(getNodePlugin("preview")).toBe(getNodePlugin("inspect"));
	});
});
