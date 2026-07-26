import type { HttpSettingsV1 } from "@quester-studio/schema";

export type HttpSettingsPatch = {
	defaultHeaders?: Record<string, string>;
	timeoutMs?: number | null;
	maxResponseBytes?: number | null;
	proxyUrl?: string;
	caFile?: string;
	verifyTls?: boolean | null;
	cookieJar?: boolean | null;
};

/** Apply UI patch onto existing HTTP settings (null clears optional fields to inherit). */
export function applyHttpSettingsPatch(
	current: HttpSettingsV1 | undefined,
	partial: HttpSettingsPatch,
): HttpSettingsV1 {
	const next: HttpSettingsV1 = {
		defaultHeaders: partial.defaultHeaders ?? current?.defaultHeaders ?? {},
	};

	if (partial.timeoutMs === null) {
		/* omit — inherit */
	} else if (partial.timeoutMs !== undefined) {
		next.timeoutMs = partial.timeoutMs;
	} else if (current?.timeoutMs !== undefined) {
		next.timeoutMs = current.timeoutMs;
	}

	if (partial.maxResponseBytes === null) {
		/* omit — inherit */
	} else if (partial.maxResponseBytes !== undefined) {
		next.maxResponseBytes = partial.maxResponseBytes;
	} else if (current?.maxResponseBytes !== undefined) {
		next.maxResponseBytes = current.maxResponseBytes;
	}

	const proxyUrl =
		partial.proxyUrl !== undefined ? partial.proxyUrl : current?.proxyUrl;
	if (proxyUrl !== undefined) next.proxyUrl = proxyUrl;

	const caFile =
		partial.caFile !== undefined ? partial.caFile : current?.caFile;
	if (caFile !== undefined) next.caFile = caFile;

	if (partial.verifyTls === null) {
		/* omit — inherit */
	} else if (partial.verifyTls !== undefined) {
		next.verifyTls = partial.verifyTls;
	} else if (current?.verifyTls !== undefined) {
		next.verifyTls = current.verifyTls;
	}

	if (partial.cookieJar === null) {
		/* omit — inherit / default on */
	} else if (partial.cookieJar !== undefined) {
		next.cookieJar = partial.cookieJar;
	} else if (current?.cookieJar !== undefined) {
		next.cookieJar = current.cookieJar;
	}

	return next;
}
