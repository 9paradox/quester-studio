const STORAGE_KEY = "quester.verifyTls";

/** Default: verify TLS certificates (secure). */
export function readTlsVerifyPreference(): boolean {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw === "0" || raw === "false") return false;
		if (raw === "1" || raw === "true") return true;
	} catch {
		/* ignore */
	}
	return true;
}

export function writeTlsVerifyPreference(verify: boolean): void {
	try {
		localStorage.setItem(STORAGE_KEY, verify ? "1" : "0");
	} catch {
		/* ignore */
	}
}
