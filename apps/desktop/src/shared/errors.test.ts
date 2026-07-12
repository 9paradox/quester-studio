import { describe, expect, test } from "bun:test";
import {
	formatErrorForConsole,
	isTlsCertificateError,
	serializeError,
} from "./errors.js";

describe("serializeError", () => {
	test("includes Bun-style TLS fields", () => {
		const err = Object.assign(
			new Error("unable to verify the first certificate"),
			{
				code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
				path: "https://example.com/users",
			},
		);
		const { message, detail } = serializeError(err);
		expect(message).toContain("certificate");
		expect(detail.code).toBe("UNABLE_TO_VERIFY_LEAF_SIGNATURE");
		expect(detail.path).toBe("https://example.com/users");
		expect(detail.stack).toBeDefined();
	});
});

describe("isTlsCertificateError", () => {
	test("detects certificate failures", () => {
		const err = Object.assign(
			new Error("unable to verify the first certificate"),
			{
				code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
			},
		);
		expect(isTlsCertificateError(err)).toBe(true);
		expect(isTlsCertificateError(new Error("timeout"))).toBe(false);
	});
});

describe("formatErrorForConsole", () => {
	test("prints message code url and stack", () => {
		const err = Object.assign(
			new Error("unable to verify the first certificate"),
			{
				code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
				path: "https://example.com",
				stack: "Error: unable to verify\n    at fetch",
			},
		);
		const text = formatErrorForConsole(err);
		expect(text).toContain("unable to verify the first certificate");
		expect(text).toContain("code: UNABLE_TO_VERIFY_LEAF_SIGNATURE");
		expect(text).toContain("url: https://example.com");
		expect(text).toContain("at fetch");
	});
});
