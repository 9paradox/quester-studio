import { describe, expect, test } from "bun:test";
import {
	classifyJmesPath,
	classifyTemplatePath,
	etaSuggestions,
	findTemplateRanges,
	formatHoverDisplay,
	getValueAtPath,
	inputKeysFromJson,
	jmesPathSnippetSuggestions,
	jmesPathSuggestions,
	resolveTemplateHover,
	templateSuggestions,
	varKeysFromNodes,
} from "./templates.js";

describe("findTemplateRanges", () => {
	test("locates every template token", () => {
		const ranges = findTemplateRanges("{{env.API_BASE}}/users/{{input.id}}");
		expect(ranges).toHaveLength(2);
		expect(ranges[0]).toEqual({ from: 0, to: 16 });
		expect(ranges[1].from).toBe(23);
	});

	test("returns empty when no templates", () => {
		expect(findTemplateRanges("https://example.com")).toEqual([]);
	});
});

describe("inputKeysFromJson", () => {
	test("reads top-level object keys", () => {
		expect(inputKeysFromJson('{"a":1,"b":2}').sort()).toEqual(["a", "b"]);
	});

	test("ignores arrays and invalid json", () => {
		expect(inputKeysFromJson("[1,2]")).toEqual([]);
		expect(inputKeysFromJson("{ not json")).toEqual([]);
	});
});

describe("varKeysFromNodes", () => {
	test("collects variables from set nodes only", () => {
		const keys = varKeysFromNodes([
			{ type: "set", data: { variables: { token: "x", retries: 3 } } },
			{ type: "http", data: { url: "x" } },
			{ type: "set", data: { variables: { token: "y", user: "z" } } },
		]);
		expect(keys.sort()).toEqual(["retries", "token", "user"]);
	});
});

const ctx = {
	nodeIds: ["login", "profile"],
	inputKeys: ["username"],
	inputPaths: ["username", "profile.age"],
	varKeys: ["token"],
	envKeys: ["API_BASE"],
	envValues: { API_BASE: "https://api.example.com" },
	secretKeys: ["password", "username"],
	nodePaths: {
		login: ["status", "body.id", "body.token"],
		profile: ["body.name"],
	},
	jmesPaths: ["status", "body.id"],
	previousPaths: ["status", "body.id"],
	inputValue: { username: "alice", profile: { age: 30 } },
	varValues: { token: "abc" },
	nodeOutputs: {
		login: { status: 200, body: { id: 42, token: "t" } },
	},
};

describe("templateSuggestions", () => {
	test("suggests roots before a dot", () => {
		expect(templateSuggestions("", ctx).map((s) => s.label)).toEqual([
			"env",
			"secrets",
			"input",
			"nodes",
			"vars",
			"previous",
		]);
	});

	test("suggests node ids after nodes.", () => {
		expect(templateSuggestions("nodes.lo", ctx).map((s) => s.label)).toEqual([
			"nodes.login",
		]);
	});

	test("suggests nested node paths", () => {
		expect(
			templateSuggestions("nodes.login.body", ctx).map((s) => s.label),
		).toEqual(["nodes.login.body.id", "nodes.login.body.token"]);
	});

	test("suggests input and vars keys", () => {
		expect(templateSuggestions("input.", ctx).map((s) => s.label)).toEqual([
			"input.username",
			"input.profile.age",
		]);
		expect(templateSuggestions("vars.", ctx).map((s) => s.label)).toEqual([
			"vars.token",
		]);
	});

	test("suggests previous paths", () => {
		expect(templateSuggestions("previous.", ctx).map((s) => s.label)).toEqual([
			"previous.status",
			"previous.body.id",
		]);
		expect(
			templateSuggestions("previous.body", ctx).map((s) => s.label),
		).toEqual(["previous.body.id"]);
	});

	test("suggests env and secrets keys", () => {
		expect(templateSuggestions("env.", ctx).map((s) => s.label)).toEqual([
			"env.API_BASE",
		]);
		expect(templateSuggestions("secrets.", ctx).map((s) => s.label)).toEqual([
			"secrets.password",
			"secrets.username",
		]);
	});
});

describe("jmesPathSuggestions", () => {
	test("filters by prefix", () => {
		expect(
			jmesPathSuggestions("body", ctx.jmesPaths).map((s) => s.label),
		).toEqual(["body.id"]);
	});

	test("includes path and snippet suggestions when empty", () => {
		const labels = jmesPathSuggestions("", ctx.jmesPaths).map((s) => s.label);
		expect(labels).toContain("status");
		expect(labels).toContain("[0]");
		expect(labels).toContain("length(@)");
	});

	test("filters snippets by typed prefix", () => {
		expect(
			jmesPathSuggestions("length", ctx.jmesPaths).some(
				(s) => s.label === "length(@)",
			),
		).toBe(true);
	});
});

describe("jmesPathSnippetSuggestions", () => {
	test("returns all snippets for empty word", () => {
		expect(jmesPathSnippetSuggestions("").length).toBeGreaterThan(5);
	});

	test("matches pipe snippets", () => {
		expect(
			jmesPathSnippetSuggestions("|").some((s) => s.label === "| [0]"),
		).toBe(true);
	});
});

describe("etaSuggestions", () => {
	test("suggests it roots", () => {
		expect(etaSuggestions("it.", ctx).map((s) => s.label)).toEqual([
			"it.input",
			"it.vars",
			"it.nodes",
			"it.previous",
		]);
	});

	test("suggests nested previous paths", () => {
		expect(etaSuggestions("it.previous.body", ctx).map((s) => s.label)).toEqual(
			["it.previous.body.id"],
		);
	});
});

describe("classifyTemplatePath", () => {
	test("known env and unknown path", () => {
		expect(classifyTemplatePath("env.API_BASE", ctx)).toBe("known");
		expect(classifyTemplatePath("env.MISSING", ctx)).toBe("unknown");
	});

	test("known node path and secret name only", () => {
		expect(classifyTemplatePath("nodes.login.body.id", ctx)).toBe("known");
		expect(classifyTemplatePath("secrets.password", ctx)).toBe("known");
		expect(classifyTemplatePath("secrets.nope", ctx)).toBe("unknown");
	});

	test("known previous paths", () => {
		expect(classifyTemplatePath("previous", ctx)).toBe("known");
		expect(classifyTemplatePath("previous.body.id", ctx)).toBe("known");
		expect(classifyTemplatePath("previous.nope", ctx)).toBe("unknown");
	});

	test("skips empty", () => {
		expect(classifyTemplatePath("  ", ctx)).toBe("skip");
	});
});

describe("classifyJmesPath", () => {
	test("known and unknown", () => {
		expect(classifyJmesPath("body.id", ctx.jmesPaths)).toBe("known");
		expect(classifyJmesPath("nope", ctx.jmesPaths)).toBe("unknown");
		expect(classifyJmesPath("body.id | length(@)", ctx.jmesPaths)).toBe("skip");
	});
});

describe("getValueAtPath", () => {
	test("walks objects and arrays", () => {
		expect(getValueAtPath({ body: { id: 1 } }, "body.id")).toBe(1);
		expect(getValueAtPath({ items: [{ n: "a" }] }, "items[0].n")).toBe("a");
	});
});

describe("resolveTemplateHover", () => {
	test("shows env value", () => {
		const hover = resolveTemplateHover("env.API_BASE", ctx);
		expect(hover?.found).toBe(true);
		expect(hover?.display).toBe("https://api.example.com");
		expect(hover?.source).toBe("environment");
	});

	test("never reveals secret values", () => {
		const hover = resolveTemplateHover("secrets.password", ctx);
		expect(hover?.found).toBe(true);
		expect(hover?.display).toBe("(secret — value hidden)");
		expect(hover?.display).not.toContain("pass");
	});

	test("shows input and node paths", () => {
		expect(resolveTemplateHover("input.username", ctx)?.display).toBe("alice");
		expect(resolveTemplateHover("nodes.login.body.id", ctx)?.display).toBe(
			"42",
		);
	});

	test("missing env key", () => {
		expect(resolveTemplateHover("env.MISSING", ctx)?.found).toBe(false);
	});
});

describe("formatHoverDisplay", () => {
	test("truncates long strings", () => {
		const long = "x".repeat(300);
		expect(formatHoverDisplay(long).endsWith("…")).toBe(true);
	});
});
