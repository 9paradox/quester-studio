import { describe, expect, test } from "bun:test";
import {
	PATH_PICKER_MAX,
	buildJmesPathPickerPaths,
	buildTemplatePickerPaths,
} from "./pathPicker.js";
import type { TemplateCompletionContext } from "./templates.js";

function emptyCtx(
	overrides: Partial<TemplateCompletionContext> = {},
): TemplateCompletionContext {
	return {
		nodeIds: [],
		inputKeys: [],
		inputPaths: [],
		varKeys: [],
		envKeys: [],
		envValues: {},
		secretKeys: [],
		formKeys: [],
		nodePaths: {},
		jmesPaths: [],
		previousPaths: [],
		inputValue: undefined,
		varValues: {},
		nodeOutputs: {},
		loopKeys: [],
		...overrides,
	};
}

describe("buildTemplatePickerPaths", () => {
	test("formats roots as {{…}} tokens", () => {
		const paths = buildTemplatePickerPaths(
			emptyCtx({
				envKeys: ["API_BASE"],
				secretKeys: ["TOKEN"],
				inputPaths: ["user.id"],
				varKeys: ["token"],
				nodeIds: ["login"],
				nodePaths: { login: ["body.token"] },
				loopKeys: ["item", "index"],
			}),
		);
		expect(paths).toContain("{{env.API_BASE}}");
		expect(paths).toContain("{{secrets.TOKEN}}");
		expect(paths).toContain("{{input.user.id}}");
		expect(paths).toContain("{{vars.token}}");
		expect(paths).toContain("{{nodes.login}}");
		expect(paths).toContain("{{nodes.login.body.token}}");
		expect(paths).toContain("{{item}}");
		expect(paths).toContain("{{index}}");
	});

	test("caps list length", () => {
		const envKeys = Array.from(
			{ length: PATH_PICKER_MAX + 50 },
			(_, i) => `K${i}`,
		);
		const paths = buildTemplatePickerPaths(emptyCtx({ envKeys }));
		expect(paths.length).toBe(PATH_PICKER_MAX);
	});
});

describe("buildJmesPathPickerPaths", () => {
	test("prefers previousPaths over jmesPaths", () => {
		expect(buildJmesPathPickerPaths(["body.id"], ["status", "body"])).toEqual([
			"body.id",
		]);
	});

	test("falls back to jmesPaths and dedupes", () => {
		expect(buildJmesPathPickerPaths([], ["a", "a", "b"])).toEqual(["a", "b"]);
	});
});
