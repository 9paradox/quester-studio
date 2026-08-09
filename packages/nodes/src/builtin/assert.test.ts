import { describe, expect, test } from "bun:test";
import type { NodeExecutionContext } from "../types.js";
import { AssertNodeError, assertPlugin } from "./assert.js";

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
	test("passes truthy and equals checks with per-check results", async () => {
		const result = await assertPlugin.execute(
			ctx(
				{
					checks: [{ path: "status", equals: 200 }, { path: "ok" }],
				},
				{ status: 200, ok: true },
			),
		);
		expect(result.output).toEqual({
			ok: true,
			failures: [],
			checks: [
				{ path: "status", ok: true },
				{ path: "ok", ok: true },
			],
		});
	});

	test("fails on mismatch with AssertNodeError and structured checks", async () => {
		try {
			await assertPlugin.execute(
				ctx(
					{
						checks: [{ path: "status", equals: 200 }, { path: "ok" }],
					},
					{ status: 500, ok: true },
				),
			);
			expect.unreachable("expected assert to throw");
		} catch (error) {
			expect(error).toBeInstanceOf(AssertNodeError);
			const assertError = error as AssertNodeError;
			expect(assertError.message).toMatch(/Assertion failed/);
			expect(assertError.output.ok).toBe(false);
			expect(assertError.output.failures).toHaveLength(1);
			expect(assertError.output.failures[0]).toMatch(/^status:/);
			expect(assertError.output.checks).toEqual([
				{
					path: "status",
					ok: false,
					message: assertError.output.failures[0],
				},
				{ path: "ok", ok: true },
			]);
		}
	});

	test("supports comparison ops", async () => {
		const result = await assertPlugin.execute(
			ctx(
				{
					checks: [
						{ path: "status", op: "gte", value: 200 },
						{ path: "status", op: "lt", value: 300 },
						{ path: "body.message", op: "contains", value: "ok" },
					],
				},
				{ status: 201, body: { message: "all ok" } },
			),
		);
		expect(result.output).toMatchObject({
			ok: true,
			failures: [],
			checks: [
				{ path: "status", ok: true },
				{ path: "status", ok: true },
				{ path: "body.message", ok: true },
			],
		});
	});

	test("fails comparison ops with detail", async () => {
		await expect(
			assertPlugin.execute(
				ctx(
					{ checks: [{ path: "status", op: "lt", value: 300 }] },
					{ status: 500 },
				),
			),
		).rejects.toThrow(/expected lt 300/);
	});
});
