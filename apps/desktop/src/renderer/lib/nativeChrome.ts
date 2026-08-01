import {
	type ThemePreference,
	applyTheme,
	readThemePreference,
	writeThemePreference,
} from "@/lib/theme.js";

/**
 * Sync UI theme to OS title bar when running under Electrobun.
 * In Vite web mode (`VITE_QUESTER_MODE=web`) only applies CSS theme.
 */
export function syncNativeChromeTheme(
	theme: ThemePreference = readThemePreference(),
): void {
	applyTheme(theme);
	if (import.meta.env.VITE_QUESTER_MODE === "web") {
		return;
	}
	void import("./electrobun.js")
		.then(({ desktopRpc }) => desktopRpc.setNativeChromeTheme(theme))
		.catch(() => {
			/* Electrobun unavailable */
		});
}

export function persistAndSyncTheme(theme: ThemePreference): void {
	writeThemePreference(theme);
	syncNativeChromeTheme(theme);
}
