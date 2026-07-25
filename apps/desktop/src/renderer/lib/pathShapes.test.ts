import { describe, expect, test } from "bun:test";
import {
	PATH_SHAPE_INDEX_MAX_ENTRIES,
	collectJsonPaths,
	formatTemplateNodePath,
	joinPathSegments,
	mergePathShapes,
	parsePathShapes,
	serializePathShapes,
	trimPathShapeIndex,
} from "./pathShapes.js";

describe("joinPathSegments", () => {
	test("builds dotted and indexed paths", () => {
		expect(joinPathSegments(["body", "user", "id"])).toBe("body.user.id");
		expect(joinPathSegments(["items", 0, "id"])).toBe("items[0].id");
		expect(joinPathSegments(["headers", "content-type"])).toBe(
			'headers."content-type"',
		);
	});
});

describe("collectJsonPaths", () => {
	test("collects nested object and array paths", () => {
		const paths = collectJsonPaths({
			status: 200,
			body: { user: { id: 1 }, tags: ["a"] },
		});
		expect(paths).toContain("status");
		expect(paths).toContain("body");
		expect(paths).toContain("body.user");
		expect(paths).toContain("body.user.id");
		expect(paths).toContain("body.tags");
		expect(paths).toContain("body.tags[0]");
	});

	test("respects maxPaths cap", () => {
		const big: Record<string, number> = {};
		for (let i = 0; i < 100; i++) big[`k${i}`] = i;
		const paths = collectJsonPaths(big, { maxPaths: 10 });
		expect(paths.length).toBeLessThanOrEqual(10);
	});

	test("returns empty for primitives at root", () => {
		expect(collectJsonPaths("hi")).toEqual([]);
		expect(collectJsonPaths(42)).toEqual([]);
	});
});

describe("mergePathShapes", () => {
	test("merges and updates lastSeen without storing values", () => {
		let index = mergePathShapes({}, "nodes.login", ["status", "body.id"], 100);
		index = mergePathShapes(index, "nodes.login", ["body.name"], 200);
		expect(index["nodes.login"]?.paths.sort()).toEqual([
			"body.id",
			"body.name",
			"status",
		]);
		expect(index["nodes.login"]?.lastSeen).toBe(200);
	});

	test("trim keeps newest sources", () => {
		const index: Record<string, { paths: string[]; lastSeen: number }> = {};
		for (let i = 0; i < 10; i++) {
			index[`nodes.n${i}`] = { paths: ["a"], lastSeen: i };
		}
		// Force over-cap by temporarily relying on trim with a fake oversized map
		const oversized = { ...index };
		for (let i = 10; i < PATH_SHAPE_INDEX_MAX_ENTRIES + 3; i++) {
			oversized[`nodes.n${i}`] = { paths: ["a"], lastSeen: i };
		}
		const trimmed = trimPathShapeIndex(oversized);
		expect(Object.keys(trimmed).length).toBe(PATH_SHAPE_INDEX_MAX_ENTRIES);
		expect(trimmed[`nodes.n${PATH_SHAPE_INDEX_MAX_ENTRIES + 2}`]).toBeDefined();
	});
});

describe("parsePathShapes", () => {
	test("round-trips serialize", () => {
		const index = mergePathShapes({}, "nodes.a", ["body.id"], 1);
		const parsed = parsePathShapes(serializePathShapes(index));
		expect(parsed["nodes.a"]?.paths).toEqual(["body.id"]);
	});

	test("returns empty on corrupt input", () => {
		expect(parsePathShapes(null)).toEqual({});
		expect(parsePathShapes({ version: 1 })).toEqual({});
		expect(parsePathShapes("nope")).toEqual({});
	});
});

describe("trimPathShapeIndex", () => {
	test("no-op under cap", () => {
		const index = { "nodes.a": { paths: ["x"], lastSeen: 1 } };
		expect(trimPathShapeIndex(index)).toEqual(index);
	});
});

describe("formatTemplateNodePath", () => {
	test("formats with and without relative path", () => {
		expect(formatTemplateNodePath("login", "body.id")).toBe(
			"{{nodes.login.body.id}}",
		);
		expect(formatTemplateNodePath("login", "")).toBe("{{nodes.login}}");
	});
});
