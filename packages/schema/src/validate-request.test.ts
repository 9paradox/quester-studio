import { describe, expect, test } from "bun:test";
import { validateRequest } from "./validate-request.js";

describe("validateRequest", () => {
	test("accepts a valid request", () => {
		const result = validateRequest({
			version: "v1",
			id: "login",
			name: "Login",
			method: "POST",
			url: "https://dummyjson.com/auth/login",
			headers: { "Content-Type": "application/json" },
			body: { username: "emilys", password: "emilyspass" },
		});
		expect(result.success).toBe(true);
	});

	test("rejects missing url", () => {
		const result = validateRequest({
			version: "v1",
			id: "bad",
			name: "Bad",
			method: "GET",
		});
		expect(result.success).toBe(false);
	});
});
