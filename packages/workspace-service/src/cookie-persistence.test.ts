import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CookieJar } from "@quester-studio/engine";
import {
	cookiesFilePath,
	loadPersistedCookieJar,
	savePersistedCookieJar,
} from "./cookie-persistence.js";

describe("cookie persistence", () => {
	test("round-trips host cookies under workspace/.quester/cookies.json", async () => {
		const dir = await mkdtemp(join(tmpdir(), "quester-cookies-"));
		try {
			const jar = new CookieJar();
			jar.storeFromSetCookie("https://api.example.com/login", [
				"session=abc; Path=/",
			]);
			await savePersistedCookieJar(dir, jar);

			const raw = JSON.parse(await readFile(cookiesFilePath(dir), "utf8")) as {
				version: number;
				hosts: Record<string, Record<string, string>>;
			};
			expect(raw.version).toBe(1);
			expect(raw.hosts["api.example.com"]?.session).toBe("abc");

			const loaded = await loadPersistedCookieJar(dir);
			expect(loaded).toBeDefined();
			const headers: Record<string, string> = {};
			loaded?.applyToHeaders("https://api.example.com/me", headers);
			expect(headers.Cookie).toBe("session=abc");
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	test("loadPersistedCookieJar returns undefined for missing file", async () => {
		const dir = await mkdtemp(join(tmpdir(), "quester-cookies-missing-"));
		try {
			expect(await loadPersistedCookieJar(dir)).toBeUndefined();
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
