export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "quester.theme";

export function readThemePreference(): ThemePreference {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw === "light" || raw === "dark" || raw === "system") return raw;
	} catch {
		/* ignore */
	}
	return "system";
}

export function writeThemePreference(theme: ThemePreference): void {
	try {
		localStorage.setItem(STORAGE_KEY, theme);
	} catch {
		/* ignore */
	}
}

export function resolveDarkClass(theme: ThemePreference): boolean {
	if (theme === "dark") return true;
	if (theme === "light") return false;
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(theme: ThemePreference): void {
	document.documentElement.classList.toggle("dark", resolveDarkClass(theme));
}
