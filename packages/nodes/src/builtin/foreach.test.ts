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
	test("maps JMESPath array with optional map expression", async () => {
		const result = await foreachPlugin.execute(
			ctx({
				node: {
					id: "f1",
					type: "foreach",
					data: { items: "items", map: "item.id", itemVar: "item" },
				},
				input: { items: [{ id: 1 }, { id: 2 }] },
			}),
		);
		expect(result.output).toEqual({
			results: [1, 2],
			count: 2,
			truncated: false,
		});
	});

	test("enforces maxItems cap", async () => {
		const result = await foreachPlugin.execute(
			ctx({
				node: {
					id: "f1",
					type: "foreach",
					data: { items: "items", maxItems: 2 },
				},
				input: { items: [1, 2, 3, 4] },
			}),
		);
		expect(result.output).toEqual({
			results: [1, 2],
			count: 2,
			truncated: true,
		});
	});

	test("resolves templated JSON array", async () => {
		const result = await foreachPlugin.execute(
			ctx({
				node: {
					id: "f1",
					type: "foreach",
					data: { items: "{{input.ids}}", maxItems: 100 },
				},
				input: {},
				resolveTemplate: () => '["a","b"]',
			}),
		);
		expect(result.output).toEqual({
			results: ["a", "b"],
			count: 2,
			truncated: false,
		});
	});

	test("aborts between items when signal is cancelled", async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(
			foreachPlugin.execute(ctx({ signal: controller.signal })),
		).rejects.toThrow("cancelled");
	});
});
