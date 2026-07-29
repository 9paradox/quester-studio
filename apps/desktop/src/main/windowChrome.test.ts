import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { resolveAppIconPath } from "./windowChrome.js";

describe("windowChrome", () => {
	test("resolveAppIconPath finds desktop assets icon", () => {
		const path = resolveAppIconPath();
		expect(path).toBeTruthy();
		expect(path && existsSync(path)).toBe(true);
		expect(path?.replaceAll("\\", "/")).toMatch(/assets\/icon\.ico$/);
	});

	test("icon asset exists next to logo", () => {
		const logo = join(
			import.meta.dir,
			"..",
			"..",
			"assets",
			"quester-logo.png",
		);
		const ico = join(import.meta.dir, "..", "..", "assets", "icon.ico");
		expect(existsSync(logo)).toBe(true);
		expect(existsSync(ico)).toBe(true);
	});
});
