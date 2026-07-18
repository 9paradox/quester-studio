import { describe, expect, test } from "bun:test";
import { builtinNodeTypes, validateNodeData } from "@quester/schema";
import {
	allPresentationTypes,
	defaultNodeData,
	getNodePresentation,
	nodeCatalogGroups,
	nodePresentation,
	presentationUsesDestructive,
} from "./nodeCatalog.js";

describe("nodePresentation", () => {
	test("covers every builtin node type exactly once", () => {
		expect(allPresentationTypes().sort()).toEqual([...builtinNodeTypes].sort());
		for (const type of builtinNodeTypes) {
			expect(nodePresentation[type].type).toBe(type);
			expect(getNodePresentation(type).icon).toBe(nodePresentation[type].icon);
		}
	});

	test("palette catalog icons match presentation icons", () => {
		const fromGroups = new Map(
			nodeCatalogGroups.flatMap((g) =>
				g.nodes.map((n) => [n.type, n.icon] as const),
			),
		);
		for (const type of builtinNodeTypes) {
			expect(fromGroups.get(type)).toBe(nodePresentation[type].icon);
		}
	});

	test("idle presentation never uses destructive accents", () => {
		for (const type of builtinNodeTypes) {
			expect(presentationUsesDestructive(type)).toBe(false);
		}
	});

	test("assert accent stays visible against dark cards", () => {
		const assert = getNodePresentation("assert");
		expect(assert.accentTone).not.toContain("chart-5");
		expect(assert.accentTone).not.toContain("destructive");
	});

	test("defaultNodeData validates for every builtin type", () => {
		for (const type of builtinNodeTypes) {
			const data = defaultNodeData(type);
			const result = validateNodeData(type, data);
			expect(result.success).toBe(true);
		}
	});

	test("assert default is a neutral truthy check", () => {
		expect(defaultNodeData("assert")).toEqual({
			label: "Assert",
			checks: [{ path: "ok" }],
		});
	});
});
