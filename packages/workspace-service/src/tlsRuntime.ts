/** App preference: verify TLS certificates (default on). Env overrides still win. */
let appTlsVerify = true;

export function setAppTlsVerify(verify: boolean): void {
	appTlsVerify = verify;
}

export function getAppTlsVerify(): boolean {
	return appTlsVerify;
}

/** Reset to default — for tests only. */
export function resetAppTlsVerifyForTests(): void {
	appTlsVerify = true;
}

/**
 * True when HTTPS should skip certificate verification.
 * Env vars force insecure regardless of the Settings preference.
 */
export function isInsecureTlsEnabled(
	env: NodeJS.ProcessEnv = process.env,
): boolean {
	if (
		env.QUESTR_INSECURE_TLS === "1" ||
		env.NODE_TLS_REJECT_UNAUTHORIZED === "0"
	) {
		return true;
	}
	return !appTlsVerify;
}

export function isTlsVerifyActive(
	env: NodeJS.ProcessEnv = process.env,
): boolean {
	return !isInsecureTlsEnabled(env);
}
