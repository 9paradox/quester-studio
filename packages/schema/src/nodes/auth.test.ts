import { describe, expect, test } from "bun:test";
import { validateNodeData } from "../flow.js";
import { apiKeyNodeDataSchema } from "./apiKey.js";
import { basicAuthNodeDataSchema } from "./basicAuth.js";
import { bearerNodeDataSchema } from "./bearer.js";

describe("auth helper node schemas", () => {
	test("bearer requires token", () => {
		expect(bearerNodeDataSchema.safeParse({ token: "abc" }).success).toBe(true);
		expect(bearerNodeDataSchema.safeParse({}).success).toBe(false);
		expect(
			validateNodeData("bearer", { token: "{{secrets.API_TOKEN}}" }).success,
		).toBe(true);
	});

	test("basicAuth requires password", () => {
		expect(
			basicAuthNodeDataSchema.safeParse({
				username: "u",
				password: "p",
			}).success,
		).toBe(true);
		expect(
			basicAuthNodeDataSchema.safeParse({ username: "u", password: "" })
				.success,
		).toBe(false);
		expect(
			validateNodeData("basicAuth", {
				username: "{{input.username}}",
				password: "{{secrets.password}}",
			}).success,
		).toBe(true);
	});

	test("apiKey header or query", () => {
		expect(
			apiKeyNodeDataSchema.safeParse({ name: "X-Api-Key", value: "k" }).success,
		).toBe(true);
		expect(
			apiKeyNodeDataSchema.parse({ name: "X-Api-Key", value: "k" }).in,
		).toBe("header");
		expect(
			apiKeyNodeDataSchema.safeParse({
				name: "apiKey",
				value: "k",
				in: "query",
			}).success,
		).toBe(true);
		expect(validateNodeData("apiKey", { name: "k" }).success).toBe(false);
	});
});
