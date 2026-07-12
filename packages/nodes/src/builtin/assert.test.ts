import { describe, expect, test } from "bun:test";
import type { NodeExecutionContext } from "../types.js";
import { assertPlugin } from "./assert.js";

function ctx(
	data: Record<string, unknown>,
	input: unknown,
): NodeExecutionContext {
	return {
		node: { id: "a", type: "assert", data },
		input,
		flowInput: {},
		vars: {},
		nodeOutputs: {},
		resolveTemplate: (t) => t,
		fetch,
	};
}

describe("assertPlugin", () => {
	test("passes truthy and equals checks", async () => {
		const result = await assertPlugin.execute(
			ctx(
				{
					checks: [{ path: "status", equals: 200 }, { path: "ok" }],
				},
				{ status: 200, ok: true },
			),
		);
		expect(result.output).toEqual({ ok: true, failures: [] });
	});

	test("fails on mismatch", async () => {
		await expect(
			assertPlugin.execute(
				ctx({ checks: [{ path: "status", equals: 200 }] }, { status: 500 }),
			),
		).rejects.toThrow(/Assertion failed/);
	});
});
