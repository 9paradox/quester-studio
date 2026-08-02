import { describe, expect, test } from "bun:test";
import { resolveTemplate } from "./variables.js";

const ctx = {
	env: { API_BASE: "https://api.example.com" },
	secrets: { TOKEN: "secret-token" },
	input: { username: "alice", profile: { age: 30 } },
	vars: { count: 2 },
	nodeOutputs: {
		login: { body: { id: 42 }, status: 200 },
	},
	previous: { status: 201, body: { id: 99, title: "widget" } },
};

describe("resolveTemplate", () => {
	test("resolves env variables", () => {
		expect(resolveTemplate("{{env.API_BASE}}/users", ctx)).toBe(
			"https://api.example.com/users",
		);
	});

	test("resolves input paths", () => {
		expect(resolveTemplate("user={{input.username}}", ctx)).toBe("user=alice");
		expect(resolveTemplate("age={{input.profile.age}}", ctx)).toBe("age=30");
	});

	test("resolves vars", () => {
		expect(resolveTemplate("n={{vars.count}}", ctx)).toBe("n=2");
	});

	test("resolves secrets", () => {
		expect(resolveTemplate("Bearer {{secrets.TOKEN}}", ctx)).toBe(
			"Bearer secret-token",
		);
	});

	test("resolves node outputs", () => {
		expect(resolveTemplate("id={{nodes.login.body.id}}", ctx)).toBe("id=42");
	});

	test("resolves previous (wire / execute input)", () => {
		expect(resolveTemplate("id={{previous.body.id}}", ctx)).toBe("id=99");
		expect(resolveTemplate("t={{previous.body.title}}", ctx)).toBe("t=widget");
		expect(resolveTemplate("s={{previous.status}}", ctx)).toBe("s=201");
	});

	test("returns empty string for missing previous paths", () => {
		expect(resolveTemplate("{{previous.missing}}", ctx)).toBe("");
		expect(
			resolveTemplate("{{previous.body.id}}", {
				...ctx,
				previous: undefined,
			}),
		).toBe("");
	});

	test("returns empty string for missing values", () => {
		expect(resolveTemplate("{{env.MISSING}}", ctx)).toBe("");
	});
});
