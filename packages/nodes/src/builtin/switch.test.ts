import { describe, expect, test } from "bun:test";
import type { NodeExecutionContext } from "../types.js";
import { switchPlugin } from "./switch.js";

function ctx(
	overrides: Partial<NodeExecutionContext> = {},
): NodeExecutionContext {
	return {
		node: {
			id: "sw",
			type: "switch",
			data: {
				expression: "x",
				cases: [{ value: "x", handle: "matched" }],
			},
		},
		input: { status: "ok" },
		flowInput: {},
		vars: {},
		nodeOutputs: {},
		resolveTemplate: (t) => t.replace("{{input.status}}", "ok"),
		fetch: fetch,
		...overrides,
	};
}

describe("switch plugin", () => {
	test("matches case by templated expression", async () => {
		const result = await switchPlugin.execute(
			ctx({
				node: {
					id: "sw",
					type: "switch",
					data: {
						expression: "{{input.status}}",
						cases: [
							{ value: "ok", handle: "success" },
							{ value: "fail", handle: "error" },
						],
					},
				},
			}),
		);
		expect(result.output).toEqual({ matched: "success" });
		expect(result.branch).toBe("success");
	});

	test("matches case by jmespath path", async () => {
		const result = await switchPlugin.execute(
			ctx({
				input: { code: 404 },
				node: {
					id: "sw",
					type: "switch",
					data: {
						path: "code",
						cases: [{ value: "404", handle: "notFound" }],
					},
				},
			}),
		);
		expect(result.output).toEqual({ matched: "notFound" });
		expect(result.branch).toBe("notFound");
	});

	test("uses defaultHandle when no case matches", async () => {
		const result = await switchPlugin.execute(
			ctx({
				node: {
					id: "sw",
					type: "switch",
					data: {
						expression: "unknown",
						cases: [{ value: "known", handle: "known" }],
						defaultHandle: "other",
					},
				},
			}),
		);
		expect(result.output).toEqual({ matched: "other" });
		expect(result.branch).toBe("other");
	});

	test("falls back to default handle name", async () => {
		const result = await switchPlugin.execute(
			ctx({
				node: {
					id: "sw",
					type: "switch",
					data: {
						expression: "unknown",
						cases: [{ value: "known", handle: "known" }],
					},
				},
			}),
		);
		expect(result.branch).toBe("default");
	});
});
