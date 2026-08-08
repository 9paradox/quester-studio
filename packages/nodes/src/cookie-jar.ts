/** Minimal in-run cookie store keyed by response hostname (host-only). */

export type CookieRecord = {
	value: string;
	path: string;
	secure: boolean;
};

/** host → cookie name → value or full record (legacy snapshots used plain strings). */
export type CookieJarSnapshot = Record<
	string,
	Record<string, string | CookieRecord>
>;

type StoredCookie = CookieRecord;

export class CookieJar {
	/** host → cookie name → record */
	private readonly byHost = new Map<string, Map<string, StoredCookie>>();

	getCookieHeader(url: string): string | undefined {
		let parsed: URL;
		try {
			parsed = new URL(url);
		} catch {
			return undefined;
		}
		const host = parsed.hostname.toLowerCase();
		const jar = this.byHost.get(host);
		if (!jar || jar.size === 0) return undefined;

		const requestPath = cookiePathFromUrl(parsed);
		const isHttps = parsed.protocol === "https:";
		const pairs: string[] = [];
		for (const [name, cookie] of jar) {
			if (cookie.secure && !isHttps) continue;
			if (!pathMatches(cookie.path, requestPath)) continue;
			pairs.push(`${name}=${cookie.value}`);
		}
		if (pairs.length === 0) return undefined;
		return pairs.join("; ");
	}

	/** Apply jar cookies unless the request already has a Cookie header. */
	applyToHeaders(url: string, headers: Record<string, string>): void {
		const hasCookie = Object.keys(headers).some(
			(k) => k.toLowerCase() === "cookie",
		);
		if (hasCookie) return;
		const value = this.getCookieHeader(url);
		if (value) headers.Cookie = value;
	}

	storeFromSetCookie(url: string, setCookieHeaders: string[]): void {
		let parsed: URL;
		try {
			parsed = new URL(url);
		} catch {
			return;
		}
		const host = parsed.hostname.toLowerCase();
		const defaultPath = defaultCookiePath(parsed.pathname);
		let jar = this.byHost.get(host);
		if (!jar) {
			jar = new Map();
			this.byHost.set(host, jar);
		}
		for (const header of setCookieHeaders) {
			const cookie = parseSetCookie(header, defaultPath);
			if (!cookie) continue;
			if (cookie.expired) {
				jar.delete(cookie.name);
			} else {
				jar.set(cookie.name, {
					value: cookie.value,
					path: cookie.path,
					secure: cookie.secure,
				});
			}
		}
	}

	storeFromResponse(url: string, headers: Headers): void {
		const getSetCookie = (
			headers as Headers & { getSetCookie?: () => string[] }
		).getSetCookie;
		const list =
			typeof getSetCookie === "function"
				? getSetCookie.call(headers)
				: headerValues(headers, "set-cookie");
		this.storeFromSetCookie(url, list);
	}

	/** Plain host → name → record map for disk persistence. */
	toSnapshot(): CookieJarSnapshot {
		const out: CookieJarSnapshot = {};
		for (const [host, jar] of this.byHost) {
			if (jar.size === 0) continue;
			const cookies: Record<string, CookieRecord> = {};
			for (const [name, cookie] of jar) {
				cookies[name] = {
					value: cookie.value,
					path: cookie.path,
					secure: cookie.secure,
				};
			}
			out[host] = cookies;
		}
		return out;
	}

	static fromSnapshot(snapshot: CookieJarSnapshot): CookieJar {
		const jar = new CookieJar();
		for (const [host, cookies] of Object.entries(snapshot)) {
			const map = new Map<string, StoredCookie>();
			for (const [name, raw] of Object.entries(cookies)) {
				map.set(name, normalizeSnapshotCookie(raw));
			}
			jar.byHost.set(host.toLowerCase(), map);
		}
		return jar;
	}
}

function normalizeSnapshotCookie(raw: string | CookieRecord): StoredCookie {
	if (typeof raw === "string") {
		return { value: raw, path: "/", secure: false };
	}
	return {
		value: raw.value,
		path: raw.path?.startsWith("/") ? raw.path : "/",
		secure: Boolean(raw.secure),
	};
}

function headerValues(headers: Headers, name: string): string[] {
	const out: string[] = [];
	headers.forEach((value, key) => {
		if (key.toLowerCase() === name) out.push(value);
	});
	return out;
}

function cookiePathFromUrl(url: URL): string {
	const path = url.pathname || "/";
	return path.startsWith("/") ? path : `/${path}`;
}

/** RFC 6265 default-path algorithm (simplified). */
function defaultCookiePath(pathname: string): string {
	if (!pathname || !pathname.startsWith("/") || pathname === "/") return "/";
	const idx = pathname.lastIndexOf("/");
	if (idx <= 0) return "/";
	return pathname.slice(0, idx) || "/";
}

/** RFC 6265 path-match (prefix + boundary). */
function pathMatches(cookiePath: string, requestPath: string): boolean {
	if (cookiePath === requestPath) return true;
	if (!requestPath.startsWith(cookiePath)) return false;
	if (cookiePath.endsWith("/")) return true;
	return requestPath.charAt(cookiePath.length) === "/";
}

function parseSetCookie(
	header: string,
	defaultPath: string,
): {
	name: string;
	value: string;
	path: string;
	secure: boolean;
	expired: boolean;
} | null {
	const parts = header.split(";").map((p) => p.trim());
	const first = parts[0];
	if (!first) return null;
	const eq = first.indexOf("=");
	if (eq <= 0) return null;
	const name = first.slice(0, eq).trim();
	const value = first.slice(eq + 1).trim();
	if (!name) return null;

	let path = defaultPath;
	let secure = false;
	let maxAge0 = false;
	let expiredDate = false;

	for (const attr of parts.slice(1)) {
		const lower = attr.toLowerCase();
		if (lower === "secure") {
			secure = true;
			continue;
		}
		if (lower.startsWith("path=")) {
			const p = attr.slice(attr.indexOf("=") + 1).trim();
			if (p.startsWith("/")) path = p;
			continue;
		}
		// Domain= ignored — cookies stay host-only under the final response host.
		if (lower.startsWith("max-age=")) {
			if (lower === "max-age=0") maxAge0 = true;
			continue;
		}
		if (lower.startsWith("expires=")) {
			const d = Date.parse(attr.slice(attr.indexOf("=") + 1).trim());
			if (Number.isFinite(d) && d <= Date.now()) expiredDate = true;
		}
	}

	return {
		name,
		value,
		path,
		secure,
		expired: maxAge0 || expiredDate,
	};
}
