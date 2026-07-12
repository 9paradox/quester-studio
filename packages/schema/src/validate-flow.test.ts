import { describe, expect, test } from "bun:test";
import { validateFlow } from "./validate-flow.js";

const validFlow = {
	id: "f1",
	version: "v1" as const,
	nodes: [
		{ id: "start", type: "start", data: {} },
		{ id: "in", type: "input", data: {} },
		{
			id: "http",
			type: "http",
			data: { method: "GET", url: "https://example.com", headers: {} },
		},
		{ id: "out", type: "output", data: {} },
	],
	edges: [
		{ id: "e0", source: "start", target: "in" },
		{ id: "e1", source: "in", target: "http" },
		{ id: "e2", source: "http", target: "out" },
	],
};

describe("validateFlow", () => {
	test("accepts a valid flow", () => {
		const result = validateFlow(validFlow);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.id).toBe("f1");
		}
	});

	test("rejects duplicate node ids", () => {
		const result = validateFlow({
			id: "f1",
			version: "v1",
			nodes: [
				{ id: "a", type: "start", data: {} },
				{ id: "a", type: "output", data: {} },
			],
			edges: [],
		});
		expect(result.success).toBe(false);
	});

	test("rejects invalid http node data", () => {
		const result = validateFlow({
			...validFlow,
			nodes: [
				{ id: "start", type: "start", data: {} },
				{ id: "in", type: "input", data: {} },
				{ id: "http", type: "http", data: { method: "GET" } },
				{ id: "out", type: "output", data: {} },
			],
			edges: [
				{ id: "e0", source: "start", target: "in" },
				{ id: "e1", source: "in", target: "http" },
				{ id: "e2", source: "http", target: "out" },
			],
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.issues?.some((i) => i.path.includes("http"))).toBe(true);
		}
	});

	test("rejects flow without start node", () => {
		const result = validateFlow({
			id: "f1",
			version: "v1",
			nodes: [{ id: "out", type: "output", data: {} }],
			edges: [],
		});
		expect(result.success).toBe(false);
	});
});
