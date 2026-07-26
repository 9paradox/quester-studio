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
});
