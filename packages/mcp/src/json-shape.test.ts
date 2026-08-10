import { describe, expect, test } from "bun:test";
import {
	collectShapePaths,
	describeValueForAgent,
	inferJsonShape,
	redactValues,
	shapeToTypeScript,
} from "./json-shape.js";

describe("json-shape", () => {
	test("inferJsonShape strips values", () => {
		const shape = inferJsonShape({
			status: 200,
			body: { token: "secret-token", name: "ada" },
			items: [{ id: 1 }, { id: 2 }],
		});
		expect(shape).toEqual({
			type: "object",
			properties: {
				status: { type: "number" },
				body: {
					type: "object",
					properties: {
						token: { type: "string" },
						name: { type: "string" },
					},
				},
				items: {
					type: "array",
					items: {
						type: "object",
						properties: { id: { type: "number" } },
					},
					lengthHint: 2,
				},
			},
		});
	});

	test("describeValueForAgent defaults without values", () => {
		const d = describeValueForAgent({ a: 1, password: "x" });
		expect(d.values).toBeUndefined();
		expect(d.paths).toContain("a");
		expect(d.typescript).toContain("type Root");
	});

	test("includeValues redacts sensitive keys and secrets", () => {
		const d = describeValueForAgent(
			{ body: { password: "p", note: "has-secret" } },
			{ includeValues: true, secretValues: ["has-secret"] },
		);
		expect(d.values).toEqual({
			body: { password: "***", note: "***" },
		});
	});

	test("redactValues", () => {
		expect(redactValues({ Authorization: "Bearer x", ok: true })).toEqual({
			Authorization: "***",
			ok: true,
		});
	});

	test("shapeToTypeScript + paths", () => {
		const shape = inferJsonShape({ user: { id: 1 } });
		expect(shapeToTypeScript(shape)).toContain("user:");
		expect(collectShapePaths(shape)).toContain("user.id");
	});
});
