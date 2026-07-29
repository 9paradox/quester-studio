import { desktopRpc } from "@/lib/electrobun.js";
import {
	type ThemePreference,
	applyTheme,
	readThemePreference,
	writeThemePreference,
} from "@/lib/theme.js";

export function syncNativeChromeTheme(
	theme: ThemePreference = readThemePreference(),
): void {
	applyTheme(theme);
	void desktopRpc.setNativeChromeTheme(theme).catch(() => {
		/* RPC unavailable in some test / preview hosts */
	});
}

export function persistAndSyncTheme(theme: ThemePreference): void {
	writeThemePreference(theme);
	syncNativeChromeTheme(theme);
}
