import { describe, expect, test } from "bun:test";
import type { NodeExecutionContext } from "../types.js";
import { jsonPlugin } from "./json.js";
import { mergePlugin } from "./merge.js";
import { transformPlugin } from "./transform.js";

function base(
	type: string,
	data: Record<string, unknown>,
	input: unknown,
	extra?: Partial<NodeExecutionContext>,
): NodeExecutionContext {
	return {
		node: { id: "n", type, data },
		input,
		flowInput: { flow: true },
		vars: { count: 1 },
		nodeOutputs: {},
		resolveTemplate: (t) => t,
		fetch,
		...extra,
	};
}

describe("transformPlugin", () => {
	test("maps JMESPath fields", async () => {
		const result = await transformPlugin.execute(
			base(
				"transform",
				{ map: { id: "user.id", name: "user.name" } },
				{ user: { id: 1, name: "Ada" } },
			),
		);
		expect(result.output).toEqual({ id: 1, name: "Ada" });
	});
});

describe("mergePlugin", () => {
	test("deep-merges sources", async () => {
		const result = await mergePlugin.execute(
			base(
				"merge",
				{ sources: ["previous", "vars"] },
				{ a: 1, nested: { x: 1 } },
				{ vars: { b: 2, nested: { y: 2 } } },
			),
		);
		expect(result.output).toEqual({
			a: 1,
			b: 2,
			nested: { x: 1, y: 2 },
		});
	});
});

describe("jsonPlugin", () => {
	test("passthrough previous", async () => {
		const result = await jsonPlugin.execute(
			base("json", {}, { hello: "world" }),
		);
		expect(result.output).toEqual({ hello: "world" });
	});

	test("expression subset", async () => {
		const result = await jsonPlugin.execute(
			base("json", { expression: "items[0]" }, { items: [{ id: 9 }] }),
		);
		expect(result.output).toEqual({ id: 9 });
	});
});
