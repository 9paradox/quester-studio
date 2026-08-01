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
		const assets = join(import.meta.dir, "..", "..", "assets");
		const logo = join(assets, "quester-logo.png");
		const logo128 = join(assets, "quester-logo-128.png");
		const logo32 = join(assets, "quester-logo-32.png");
		const ico = join(assets, "icon.ico");
		expect(existsSync(logo)).toBe(true);
		expect(existsSync(logo128)).toBe(true);
		expect(existsSync(logo32)).toBe(true);
		expect(existsSync(ico)).toBe(true);
	});
});
