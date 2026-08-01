import { describe, expect, mock, test } from "bun:test";
import type { NodeExecutionContext } from "../types.js";
import { subflowPlugin } from "./subflow.js";

function ctx(
	overrides: Partial<NodeExecutionContext> = {},
): NodeExecutionContext {
	return {
		node: { id: "s1", type: "subflow", data: { flowId: "child" } },
		input: {},
		flowInput: {},
		vars: {},
		nodeOutputs: {},
		resolveTemplate: (t) => t,
		fetch: fetch,
		...overrides,
	};
}

describe("subflow plugin", () => {
	test("calls executeSubflow with resolved input", async () => {
		const executeSubflow = mock(async () => ({ done: true }));
		const result = await subflowPlugin.execute(
			ctx({
				node: {
					id: "s1",
					type: "subflow",
					data: {
						flowId: "child",
						input: { userId: "{{input.id}}", count: "2" },
					},
				},
				input: { id: "u1" },
				resolveTemplate: (t) => (t === "{{input.id}}" ? "u1" : t),
				executeSubflow,
			}),
		);
		expect(executeSubflow).toHaveBeenCalledWith("child", {
			userId: "u1",
			count: 2,
		});
		expect(result.output).toEqual({ done: true });
	});

	test("throws when executeSubflow is unavailable", async () => {
		await expect(subflowPlugin.execute(ctx())).rejects.toThrow("not available");
	});
});
