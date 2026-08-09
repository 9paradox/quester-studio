import { describe, expect, test } from "bun:test";
import type { NodeExecutionContext } from "../types.js";
import { tryPlugin } from "./try.js";

function ctx(
	overrides: Partial<NodeExecutionContext> = {},
): NodeExecutionContext {
	return {
		node: { id: "t1", type: "try", data: {} },
		input: { status: 200 },
		flowInput: {},
		vars: {},
		nodeOutputs: {},
		resolveTemplate: (t) => t,
		fetch: fetch,
		...overrides,
	};
}

describe("try plugin", () => {
	test("accepts framed try data and returns success stub", async () => {
		const result = await tryPlugin.execute(ctx());
		expect(result.branch).toBe("success");
		expect(result.output).toEqual({ status: 200 });
	});

	test("rejects legacy soft checks", async () => {
		await expect(
			tryPlugin.execute(
				ctx({
					node: {
						id: "t1",
						type: "try",
						data: { checks: [{ path: "status", op: "eq", value: 200 }] },
					},
				}),
			),
		).rejects.toThrow();
	});
});
