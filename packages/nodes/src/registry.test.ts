import { describe, expect, test } from "bun:test";
import { builtinNodeTypes } from "@quester/schema";
import { getNodePlugin, listNodePlugins } from "./registry.js";
import "./index.js";

describe("node registry", () => {
	test("registers all built-in plugins", () => {
		for (const type of builtinNodeTypes) {
			expect(getNodePlugin(type)).toBeDefined();
		}
		expect(listNodePlugins()).toHaveLength(builtinNodeTypes.length);
	});
});
