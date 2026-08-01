import { describe, expect, test } from "bun:test";
import type { NodeExecutionContext } from "../types.js";
import { tryPlugin } from "./try.js";

function ctx(
	overrides: Partial<NodeExecutionContext> = {},
): NodeExecutionContext {
	return {
		node: { id: "t1", type: "try", data: { condition: "true" } },
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
	test("branches ok when checks pass", async () => {
		const result = await tryPlugin.execute(
			ctx({
				node: {
					id: "t1",
					type: "try",
					data: { checks: [{ path: "status", op: "eq", value: 200 }] },
				},
			}),
		);
		expect(result.branch).toBe("ok");
		expect(result.output).toEqual({ ok: true, input: { status: 200 } });
	});

	test("branches catch when checks fail", async () => {
		const result = await tryPlugin.execute(
			ctx({
				input: { status: 404 },
				node: {
					id: "t1",
					type: "try",
					data: { checks: [{ path: "status", op: "eq", value: 200 }] },
				},
			}),
		);
		expect(result.branch).toBe("catch");
		expect(result.output).toEqual({ ok: false, input: { status: 404 } });
	});
});
