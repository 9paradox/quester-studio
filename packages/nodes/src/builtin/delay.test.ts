import { describe, expect, test } from "bun:test";
import type { NodeExecutionContext } from "../types.js";
import { delayPlugin } from "./delay.js";

function ctx(
	overrides: Partial<NodeExecutionContext> = {},
): NodeExecutionContext {
	return {
		node: { id: "n1", type: "delay", data: { ms: 0 } },
		input: { id: 42 },
		flowInput: {},
		vars: {},
		nodeOutputs: {},
		resolveTemplate: (t) => t,
		fetch: fetch,
		...overrides,
	};
}

describe("delay plugin", () => {
	test("passthrough input after sleep", async () => {
		const input = { id: 42, name: "test" };
		const result = await delayPlugin.execute(
			ctx({ input, node: { id: "d1", type: "delay", data: { ms: 0 } } }),
		);
		expect(result.output).toEqual(input);
	});

	test("wait alias behaves like delay", async () => {
		const input = { ok: true };
		const { getNodePlugin } = await import("../registry.js");
		const wait = getNodePlugin("wait");
		if (!wait) throw new Error("wait alias not registered");
		const result = await wait.execute(
			ctx({ input, node: { id: "w1", type: "wait", data: { ms: 0 } } }),
		);
		expect(result.output).toEqual(input);
	});
});
