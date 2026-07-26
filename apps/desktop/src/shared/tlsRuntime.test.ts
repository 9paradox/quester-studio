import { afterEach, describe, expect, test } from "bun:test";
import {
	getAppTlsVerify,
	isInsecureTlsEnabled,
	isTlsVerifyActive,
	resetAppTlsVerifyForTests,
	setAppTlsVerify,
} from "./tlsRuntime.js";

afterEach(() => {
	resetAppTlsVerifyForTests();
});

describe("tlsRuntime", () => {
	test("defaults to verify on", () => {
		expect(getAppTlsVerify()).toBe(true);
		expect(isTlsVerifyActive({})).toBe(true);
		expect(isInsecureTlsEnabled({})).toBe(false);
	});

	test("Settings preference can disable verify", () => {
		setAppTlsVerify(false);
		expect(getAppTlsVerify()).toBe(false);
		expect(isInsecureTlsEnabled({})).toBe(true);
		expect(isTlsVerifyActive({})).toBe(false);
	});

	test("QUESTR_INSECURE_TLS env forces insecure even if preference is on", () => {
		setAppTlsVerify(true);
		expect(
			isInsecureTlsEnabled({ QUESTR_INSECURE_TLS: "1" } as NodeJS.ProcessEnv),
		).toBe(true);
		expect(
			isTlsVerifyActive({ QUESTR_INSECURE_TLS: "1" } as NodeJS.ProcessEnv),
		).toBe(false);
	});

	test("NODE_TLS_REJECT_UNAUTHORIZED=0 forces insecure", () => {
		expect(
			isInsecureTlsEnabled({
				NODE_TLS_REJECT_UNAUTHORIZED: "0",
			} as NodeJS.ProcessEnv),
		).toBe(true);
	});
});
