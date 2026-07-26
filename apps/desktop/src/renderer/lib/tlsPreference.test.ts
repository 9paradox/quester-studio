import { afterEach, describe, expect, test } from "bun:test";
import {
	readTlsVerifyPreference,
	writeTlsVerifyPreference,
} from "./tlsPreference.js";

const STORAGE_KEY = "quester.verifyTls";

afterEach(() => {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		/* ignore */
	}
});

describe("tlsPreference", () => {
	test("defaults to verify on", () => {
		expect(readTlsVerifyPreference()).toBe(true);
	});

	test("round-trips false and true", () => {
		writeTlsVerifyPreference(false);
		expect(readTlsVerifyPreference()).toBe(false);
		writeTlsVerifyPreference(true);
		expect(readTlsVerifyPreference()).toBe(true);
	});
});
