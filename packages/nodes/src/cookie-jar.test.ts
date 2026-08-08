import { describe, expect, test } from "bun:test";
import { CookieJar } from "./cookie-jar.js";

describe("CookieJar", () => {
	test("stores Set-Cookie and applies Cookie header", () => {
		const jar = new CookieJar();
		jar.storeFromSetCookie("https://api.example.com/login", [
			"session=abc; Path=/; HttpOnly",
			"theme=dark",
		]);
		const headers: Record<string, string> = {};
		jar.applyToHeaders("https://api.example.com/me", headers);
		expect(headers.Cookie).toBe("session=abc; theme=dark");
	});

	test("does not override an explicit Cookie header", () => {
		const jar = new CookieJar();
		jar.storeFromSetCookie("https://api.example.com/", ["a=1"]);
		const headers = { Cookie: "manual=1" };
		jar.applyToHeaders("https://api.example.com/", headers);
		expect(headers.Cookie).toBe("manual=1");
	});

	test("isolates cookies by host", () => {
		const jar = new CookieJar();
		jar.storeFromSetCookie("https://a.example.com/", ["x=1"]);
		const headers: Record<string, string> = {};
		jar.applyToHeaders("https://b.example.com/", headers);
		expect(headers.Cookie).toBeUndefined();
	});

	test("expires cookies with Max-Age=0", () => {
		const jar = new CookieJar();
		jar.storeFromSetCookie("https://api.example.com/", ["session=abc"]);
		jar.storeFromSetCookie("https://api.example.com/", ["session=; Max-Age=0"]);
		const headers: Record<string, string> = {};
		jar.applyToHeaders("https://api.example.com/", headers);
		expect(headers.Cookie).toBeUndefined();
	});

	test("snapshot round-trips host cookies with path/secure", () => {
		const jar = new CookieJar();
		jar.storeFromSetCookie("https://api.example.com/login", [
			"a=1; Path=/; Secure",
			"b=2; Path=/api",
		]);
		const snap = jar.toSnapshot();
		expect(snap["api.example.com"]?.a).toEqual({
			value: "1",
			path: "/",
			secure: true,
		});
		const restored = CookieJar.fromSnapshot(snap);
		const httpsHeaders: Record<string, string> = {};
		restored.applyToHeaders("https://api.example.com/api/me", httpsHeaders);
		expect(httpsHeaders.Cookie).toBe("a=1; b=2");
	});

	test("loads legacy string snapshot values", () => {
		const restored = CookieJar.fromSnapshot({
			"api.example.com": { session: "abc" },
		});
		const headers: Record<string, string> = {};
		restored.applyToHeaders("https://api.example.com/me", headers);
		expect(headers.Cookie).toBe("session=abc");
	});

	test("honors Secure — not sent over http", () => {
		const jar = new CookieJar();
		jar.storeFromSetCookie("https://api.example.com/", [
			"sid=1; Path=/; Secure",
		]);
		const httpHeaders: Record<string, string> = {};
		jar.applyToHeaders("http://api.example.com/", httpHeaders);
		expect(httpHeaders.Cookie).toBeUndefined();
		const httpsHeaders: Record<string, string> = {};
		jar.applyToHeaders("https://api.example.com/", httpsHeaders);
		expect(httpsHeaders.Cookie).toBe("sid=1");
	});

	test("honors Path prefix match", () => {
		const jar = new CookieJar();
		jar.storeFromSetCookie("https://api.example.com/api/v1/login", [
			"tok=1; Path=/api",
		]);
		const miss: Record<string, string> = {};
		jar.applyToHeaders("https://api.example.com/other", miss);
		expect(miss.Cookie).toBeUndefined();
		const hit: Record<string, string> = {};
		jar.applyToHeaders("https://api.example.com/api/me", hit);
		expect(hit.Cookie).toBe("tok=1");
	});
});
