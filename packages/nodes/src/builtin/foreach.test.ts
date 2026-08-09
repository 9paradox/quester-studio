import { describe, expect, test } from "bun:test";
import type { NodeExecutionContext } from "../types.js";
import { foreachPlugin } from "./foreach.js";

function ctx(
	overrides: Partial<NodeExecutionContext> = {},
): NodeExecutionContext {
	return {
		node: {
			id: "f1",
			type: "foreach",
			data: { items: "items", maxItems: 100 },
		},
		input: { items: [1, 2, 3] },
		flowInput: {},
		vars: {},
		nodeOutputs: {},
		resolveTemplate: (t) => t,
		fetch: fetch,
		...overrides,
	};
}

describe("foreach plugin", () => {
	test("accepts framed foreach data", async () => {
		const result = await foreachPlugin.execute(ctx());
		expect(result.branch).toBe("complete");
		expect(result.output).toEqual({ results: [], count: 0, truncated: false });
	});

	test("rejects legacy map field", async () => {
		await expect(
			foreachPlugin.execute(
				ctx({
					node: {
						id: "f1",
						type: "foreach",
						data: { items: "items", map: "item" },
					},
				}),
			),
		).rejects.toThrow();
	});
});
