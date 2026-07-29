import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	isThemePreference,
	parseAppPreferences,
} from "../shared/appPreferences.js";
import {
	getAppPreferencesDir,
	getAppPreferencesPath,
	readAppPreferences,
	resolvePreferredDark,
	writeAppPreferences,
} from "./appPreferences.js";

const prevPrefsDir = process.env.QUESTR_PREFS_DIR;

function withTempPrefsDir(run: (dir: string) => void) {
	const dir = join(
		tmpdir(),
		`quester-prefs-${Date.now()}-${Math.random().toString(16).slice(2)}`,
	);
	mkdirSync(dir, { recursive: true });
	process.env.QUESTR_PREFS_DIR = dir;
	try {
		run(dir);
	} finally {
		if (prevPrefsDir === undefined) process.env.QUESTR_PREFS_DIR = undefined;
		else process.env.QUESTR_PREFS_DIR = prevPrefsDir;
		rmSync(dir, { recursive: true, force: true });
	}
}

afterEach(() => {
	if (prevPrefsDir === undefined) process.env.QUESTR_PREFS_DIR = undefined;
	else process.env.QUESTR_PREFS_DIR = prevPrefsDir;
});

describe("shared appPreferences", () => {
	test("isThemePreference / parseAppPreferences", () => {
		expect(isThemePreference("dark")).toBe(true);
		expect(isThemePreference("nope")).toBe(false);
		expect(parseAppPreferences({ theme: "light" })).toEqual({ theme: "light" });
		expect(parseAppPreferences({ theme: 1 })).toEqual({});
		expect(parseAppPreferences(null)).toEqual({});
	});
});

describe("main appPreferences", () => {
	test("dir and path honor QUESTR_PREFS_DIR", () => {
		withTempPrefsDir((dir) => {
			expect(getAppPreferencesDir()).toBe(dir);
			expect(getAppPreferencesPath()).toBe(join(dir, "preferences.json"));
		});
	});

	test("read/write round-trip", () => {
		withTempPrefsDir(() => {
			expect(readAppPreferences()).toEqual({});
			writeAppPreferences({ theme: "dark" });
			expect(readAppPreferences()).toEqual({ theme: "dark" });
			writeAppPreferences({ theme: "system" });
			expect(readAppPreferences()).toEqual({ theme: "system" });
			expect(existsSync(getAppPreferencesPath())).toBe(true);
		});
	});

	test("resolvePreferredDark honors light/dark", () => {
		expect(resolvePreferredDark("light")).toBe(false);
		expect(resolvePreferredDark("dark")).toBe(true);
	});

	test("corrupt file yields empty prefs", () => {
		withTempPrefsDir((dir) => {
			writeFileSync(join(dir, "preferences.json"), "{not-json", "utf8");
			expect(readAppPreferences()).toEqual({});
		});
	});
});
