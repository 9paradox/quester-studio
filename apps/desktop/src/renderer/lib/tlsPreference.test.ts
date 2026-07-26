import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import {
	readTlsVerifyPreference,
	writeTlsVerifyPreference,
} from "./tlsPreference.js";

const STORAGE_KEY = "quester.verifyTls";

const store = new Map<string, string>();

const localStorageMock = {
	getItem: (key: string) => store.get(key) ?? null,
	setItem: (key: string, value: string) => {
		store.set(key, String(value));
	},
	removeItem: (key: string) => {
		store.delete(key);
	},
	clear: () => {
		store.clear();
	},
};

beforeAll(() => {
	Object.defineProperty(globalThis, "localStorage", {
		value: localStorageMock,
		configurable: true,
	});
});

afterEach(() => {
	store.clear();
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
