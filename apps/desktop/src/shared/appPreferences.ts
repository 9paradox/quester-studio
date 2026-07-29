export type ThemePreference = "light" | "dark" | "system";

export type AppPreferencesFile = {
	theme?: ThemePreference;
};

export function isThemePreference(value: unknown): value is ThemePreference {
	return value === "light" || value === "dark" || value === "system";
}

export function parseAppPreferences(raw: unknown): AppPreferencesFile {
	if (!raw || typeof raw !== "object") return {};
	const theme = (raw as { theme?: unknown }).theme;
	return isThemePreference(theme) ? { theme } : {};
}
