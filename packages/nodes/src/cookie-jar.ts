/** Minimal in-run cookie store keyed by request hostname. */

export type CookieJarSnapshot = Record<string, Record<string, string>>;

export class CookieJar {
	/** host → cookie name → value */
	private readonly byHost = new Map<string, Map<string, string>>();

	getCookieHeader(url: string): string | undefined {
		let host: string;
		try {
			host = new URL(url).hostname.toLowerCase();
		} catch {
			return undefined;
		}
		const jar = this.byHost.get(host);
		if (!jar || jar.size === 0) return undefined;
		return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
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
		let host: string;
		try {
			host = new URL(url).hostname.toLowerCase();
		} catch {
			return;
		}
		let jar = this.byHost.get(host);
		if (!jar) {
			jar = new Map();
			this.byHost.set(host, jar);
		}
		for (const header of setCookieHeaders) {
			const parsed = parseSetCookiePair(header);
			if (!parsed) continue;
			if (parsed.expired) {
				jar.delete(parsed.name);
			} else {
				jar.set(parsed.name, parsed.value);
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

	/** Plain host → name → value map for disk persistence. */
	toSnapshot(): CookieJarSnapshot {
		const out: CookieJarSnapshot = {};
		for (const [host, jar] of this.byHost) {
			if (jar.size > 0) out[host] = Object.fromEntries(jar);
		}
		return out;
	}

	static fromSnapshot(snapshot: CookieJarSnapshot): CookieJar {
		const jar = new CookieJar();
		for (const [host, cookies] of Object.entries(snapshot)) {
			jar.byHost.set(host, new Map(Object.entries(cookies)));
		}
		return jar;
	}
}

function headerValues(headers: Headers, name: string): string[] {
	const out: string[] = [];
	headers.forEach((value, key) => {
		if (key.toLowerCase() === name) out.push(value);
	});
	return out;
}

function parseSetCookiePair(
	header: string,
): { name: string; value: string; expired: boolean } | null {
	const first = header.split(";")[0]?.trim();
	if (!first) return null;
	const eq = first.indexOf("=");
	if (eq <= 0) return null;
	const name = first.slice(0, eq).trim();
	const value = first.slice(eq + 1).trim();
	if (!name) return null;
	const attrs = header
		.split(";")
		.slice(1)
		.map((p) => p.trim().toLowerCase());
	const maxAge0 = attrs.some((a) => a.startsWith("max-age=0"));
	const expiredDate = attrs.some((a) => {
		if (!a.startsWith("expires=")) return false;
		const d = Date.parse(a.slice("expires=".length));
		return Number.isFinite(d) && d <= Date.now();
	});
	return { name, value, expired: maxAge0 || expiredDate };
}
