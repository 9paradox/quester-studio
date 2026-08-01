import { describe, expect, test } from "bun:test";
import type { NodeExecutionContext } from "../types.js";
import { logPlugin } from "./log.js";

function ctx(
	overrides: Partial<NodeExecutionContext> = {},
): NodeExecutionContext {
	return {
		node: { id: "log1", type: "log", data: { message: "hello" } },
		input: { id: 1 },
		flowInput: {},
		vars: {},
		nodeOutputs: {},
		resolveTemplate: (t) => t.replace("{{input.id}}", "1"),
		fetch: fetch,
		...overrides,
	};
}

describe("logPlugin", () => {
	test("resolves message and passthrough input with logged field", async () => {
		const result = await logPlugin.execute(
			ctx({
				node: {
					id: "log1",
					type: "log",
					data: { message: "user={{input.id}}" },
				},
			}),
		);
		expect(result.output).toEqual({ id: 1, logged: "user=1" });
	});

	test("wraps non-object input", async () => {
		const result = await logPlugin.execute(
			ctx({
				input: "plain",
				node: { id: "l", type: "log", data: { message: "x" } },
			}),
		);
		expect(result.output).toEqual({ value: "plain", logged: "x" });
	});
});
