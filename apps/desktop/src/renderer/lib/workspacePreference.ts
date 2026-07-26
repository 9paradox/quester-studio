const LAST_KEY = "quester.lastWorkspacePath";
const RECENTS_KEY = "quester.recentWorkspacePaths";
const MAX_RECENTS = 5;

export function readLastWorkspacePath(): string | null {
	try {
		const raw = localStorage.getItem(LAST_KEY);
		return raw?.trim() ? raw.trim() : null;
	} catch {
		return null;
	}
}

export function writeLastWorkspacePath(path: string | null): void {
	try {
		if (!path) {
			localStorage.removeItem(LAST_KEY);
			return;
		}
		localStorage.setItem(LAST_KEY, path);
	} catch {
		/* ignore */
	}
}

export function readRecentWorkspacePaths(): string[] {
	try {
		const raw = localStorage.getItem(RECENTS_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
			.slice(0, MAX_RECENTS);
	} catch {
		return [];
	}
}

/** Prepend path and de-dupe; keeps at most MAX_RECENTS. */
export function rememberWorkspacePath(path: string): string[] {
	const normalized = path.trim();
	if (!normalized) return readRecentWorkspacePaths();
	const next = [
		normalized,
		...readRecentWorkspacePaths().filter(
			(p) => p.toLowerCase() !== normalized.toLowerCase(),
		),
	].slice(0, MAX_RECENTS);
	try {
		localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
		localStorage.setItem(LAST_KEY, normalized);
	} catch {
		/* ignore */
	}
	return next;
}

export function clearLastWorkspacePath(): void {
	writeLastWorkspacePath(null);
}
