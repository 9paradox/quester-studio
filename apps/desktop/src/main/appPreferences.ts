import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
	type AppPreferencesFile,
	type ThemePreference,
	isThemePreference,
	parseAppPreferences,
} from "../shared/appPreferences.js";

const PREFS_FILE = "preferences.json";

/** Override for tests: absolute directory for app preferences. */
export function getAppPreferencesDir(): string {
	const fromEnv = process.env.QUESTR_PREFS_DIR?.trim();
	if (fromEnv) return fromEnv;

	if (process.platform === "win32") {
		const base =
			process.env.LOCALAPPDATA?.trim() || join(homedir(), "AppData", "Local");
		return join(base, "Quester");
	}
	if (process.platform === "darwin") {
		return join(homedir(), "Library", "Application Support", "Quester");
	}
	const xdg = process.env.XDG_CONFIG_HOME?.trim();
	return join(xdg || join(homedir(), ".config"), "quester");
}

export function getAppPreferencesPath(): string {
	return join(getAppPreferencesDir(), PREFS_FILE);
}

export function readAppPreferences(): AppPreferencesFile {
	const path = getAppPreferencesPath();
	if (!existsSync(path)) return {};
	try {
		const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
		return parseAppPreferences(raw);
	} catch {
		return {};
	}
}

export function writeAppPreferences(
	partial: AppPreferencesFile,
): AppPreferencesFile {
	const dir = getAppPreferencesDir();
	mkdirSync(dir, { recursive: true });
	const next: AppPreferencesFile = { ...readAppPreferences() };
	if (partial.theme !== undefined && isThemePreference(partial.theme)) {
		next.theme = partial.theme;
	}
	writeFileSync(
		getAppPreferencesPath(),
		`${JSON.stringify(next, null, 2)}\n`,
		"utf8",
	);
	return next;
}

/** Best-effort OS dark-mode detection for `theme: "system"`. */
export function isOsDarkMode(): boolean {
	if (process.platform === "win32") {
		try {
			const out = execFileSync(
				"reg",
				[
					"query",
					"HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize",
					"/v",
					"AppsUseLightTheme",
				],
				{ encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
			);
			// 0x0 = dark, 0x1 = light
			return /AppsUseLightTheme\s+REG_DWORD\s+0x0\b/i.test(out);
		} catch {
			return true;
		}
	}
	if (process.platform === "darwin") {
		try {
			const out = execFileSync(
				"defaults",
				["read", "-g", "AppleInterfaceStyle"],
				{
					encoding: "utf8",
					stdio: ["ignore", "pipe", "ignore"],
				},
			).trim();
			return out.toLowerCase() === "dark";
		} catch {
			return false;
		}
	}
	const colorScheme = process.env.COLORFGBG || process.env.GTK_THEME || "";
	if (/dark/i.test(colorScheme)) return true;
	if (/light/i.test(colorScheme)) return false;
	return true;
}

export function resolvePreferredDark(
	theme: ThemePreference | undefined = readAppPreferences().theme,
): boolean {
	if (theme === "light") return false;
	if (theme === "dark") return true;
	return isOsDarkMode();
}

export function setThemePreference(theme: ThemePreference): boolean {
	writeAppPreferences({ theme });
	return resolvePreferredDark(theme);
}
