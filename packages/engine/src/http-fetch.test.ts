import { describe, expect, test } from "bun:test";
import { resolveTlsVerifyActive } from "./http-fetch.js";

describe("resolveTlsVerifyActive", () => {
	test("defaults to verify on", () => {
		expect(resolveTlsVerifyActive({ env: {} })).toBe(true);
	});

	test("env forces insecure", () => {
		expect(
			resolveTlsVerifyActive({
				env: { QUESTR_INSECURE_TLS: "1" },
				appVerifyTls: true,
				httpDefaults: { defaultHeaders: {}, verifyTls: true },
			}),
		).toBe(false);
	});

	test("settings.verifyTls overrides app preference", () => {
		expect(
			resolveTlsVerifyActive({
				env: {},
				appVerifyTls: true,
				httpDefaults: { defaultHeaders: {}, verifyTls: false },
			}),
		).toBe(false);
		expect(
			resolveTlsVerifyActive({
				env: {},
				appVerifyTls: false,
				httpDefaults: { defaultHeaders: {}, verifyTls: true },
			}),
		).toBe(true);
	});

	test("app preference used when settings omit verifyTls", () => {
		expect(
			resolveTlsVerifyActive({
				env: {},
				appVerifyTls: false,
				httpDefaults: { defaultHeaders: {} },
			}),
		).toBe(false);
	});
});
