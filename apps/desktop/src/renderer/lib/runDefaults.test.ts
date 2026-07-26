import { describe, expect, test } from "bun:test";
import type { FlowV1 } from "@quester-studio/schema";
import {
	DEFAULT_INPUT,
	formatRunInputJson,
	runInputJsonFromFlow,
	withInputNodeValue,
} from "./runDefaults.js";

const baseFlow = (nodes: FlowV1["nodes"]): FlowV1 => ({
	id: "demo",
	version: "v1",
	nodes,
	edges: [],
});

describe("DEFAULT_INPUT", () => {
	test("is neutral empty JSON object", () => {
		expect(JSON.parse(DEFAULT_INPUT)).toEqual({});
		expect(DEFAULT_INPUT).not.toContain("emilys");
		expect(DEFAULT_INPUT).not.toContain("password");
	});
});

describe("runInputJsonFromFlow", () => {
	test("returns DEFAULT_INPUT when no input node", () => {
		expect(
			runInputJsonFromFlow(
				baseFlow([{ id: "start", type: "start", data: {} }]),
			),
		).toBe(DEFAULT_INPUT);
	});

	test("returns DEFAULT_INPUT when input node has no value", () => {
		expect(
			runInputJsonFromFlow(
				baseFlow([
					{ id: "start", type: "start", data: {} },
					{ id: "input", type: "input", data: { label: "In" } },
				]),
			),
		).toBe(DEFAULT_INPUT);
	});

	test("reads persisted value from input node", () => {
		const json = runInputJsonFromFlow(
			baseFlow([
				{
					id: "input",
					type: "input",
					data: { value: { username: "emilys", productTitle: "Pencil" } },
				},
			]),
		);
		expect(JSON.parse(json)).toEqual({
			username: "emilys",
			productTitle: "Pencil",
		});
	});
});

describe("withInputNodeValue", () => {
	test("sets value on the first input node", () => {
		const flow = withInputNodeValue(
			baseFlow([
				{ id: "start", type: "start", data: {} },
				{ id: "input", type: "input", data: { label: "In" } },
			]),
			{ a: 1 },
		);
		expect(flow.nodes[1]?.data).toEqual({ label: "In", value: { a: 1 } });
	});

	test("no-op without an input node", () => {
		const original = baseFlow([{ id: "start", type: "start", data: {} }]);
		expect(withInputNodeValue(original, { a: 1 })).toBe(original);
	});
});

describe("formatRunInputJson", () => {
	test("pretty-prints with trailing newline", () => {
		expect(formatRunInputJson({ x: 1 })).toBe('{\n  "x": 1\n}\n');
	});
});
