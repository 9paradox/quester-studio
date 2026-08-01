import { readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import type { HttpSettingsV1 } from "@quester-studio/schema";

export type CreateHttpFetchOptions = {
	httpDefaults?: HttpSettingsV1 | null;
	/** Workspace root for resolving relative `caFile`. */
	workspaceRoot?: string;
	/**
	 * App/machine preference when `httpDefaults.verifyTls` is unset.
	 * Default true (verify on).
	 */
	appVerifyTls?: boolean;
	env?: NodeJS.ProcessEnv;
	/** Run-level abort signal merged into every fetch RequestInit. */
	signal?: AbortSignal;
};

/**
 * Resolve whether TLS verification is active.
 * Precedence: env insecure → settings.verifyTls → appVerifyTls.
 */
export function resolveTlsVerifyActive(
	options: CreateHttpFetchOptions = {},
): boolean {
	const env = options.env ?? process.env;
	if (
		env.QUESTR_INSECURE_TLS === "1" ||
		env.NODE_TLS_REJECT_UNAUTHORIZED === "0"
	) {
		return false;
	}
	if (options.httpDefaults?.verifyTls !== undefined) {
		return options.httpDefaults.verifyTls;
	}
	return options.appVerifyTls !== false;
}

function resolveCaPem(
	caFile: string | undefined,
	workspaceRoot: string | undefined,
): string | undefined {
	if (!caFile) return undefined;
	const path = isAbsolute(caFile)
		? caFile
		: workspaceRoot
			? join(workspaceRoot, caFile)
			: caFile;
	return readFileSync(path, "utf8");
}

type BunFetchInit = RequestInit & {
	proxy?: string;
	tls?: {
		rejectUnauthorized?: boolean;
		ca?: string | Buffer;
	};
};

/** Bun-aware fetch applying proxy, CA, and TLS verify from HTTP settings. */
export function createHttpFetch(
	options: CreateHttpFetchOptions = {},
): typeof fetch {
	const http = options.httpDefaults;
	const proxyUrl = http?.proxyUrl?.trim() || undefined;
	const caFile = http?.caFile?.trim() || undefined;
	const verify = resolveTlsVerifyActive(options);
	const ca = caFile ? resolveCaPem(caFile, options.workspaceRoot) : undefined;
	const runSignal = options.signal;

	const needsWrap =
		Boolean(proxyUrl) || Boolean(ca) || !verify || Boolean(runSignal);
	if (!needsWrap) return fetch;

	return ((input: RequestInfo | URL, init?: RequestInit) => {
		const next: BunFetchInit = { ...(init as BunFetchInit) };
		if (runSignal) {
			next.signal = init?.signal
				? AbortSignal.any([runSignal, init.signal])
				: runSignal;
		}
		if (proxyUrl) next.proxy = proxyUrl;
		if (!verify || ca) {
			next.tls = {
				...(next.tls ?? {}),
				...(ca ? { ca } : {}),
				...(!verify ? { rejectUnauthorized: false } : {}),
			};
		}
		return fetch(input, next as RequestInit);
	}) as typeof fetch;
}
