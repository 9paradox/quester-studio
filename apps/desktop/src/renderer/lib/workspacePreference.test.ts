import { afterEach, describe, expect, test } from "bun:test";
import {
	clearLastWorkspacePath,
	readLastWorkspacePath,
	readRecentWorkspacePaths,
	rememberWorkspacePath,
} from "./workspacePreference.js";

describe("workspacePreference", () => {
	afterEach(() => {
		localStorage.clear();
	});

	test("rememberWorkspacePath writes last and recents", () => {
		rememberWorkspacePath("/ws/a");
		rememberWorkspacePath("/ws/b");
		expect(readLastWorkspacePath()).toBe("/ws/b");
		expect(readRecentWorkspacePaths()).toEqual(["/ws/b", "/ws/a"]);
	});

	test("rememberWorkspacePath de-dupes case-insensitively", () => {
		rememberWorkspacePath("/Ws/A");
		rememberWorkspacePath("/ws/a");
		expect(readRecentWorkspacePaths()).toEqual(["/ws/a"]);
	});

	test("clearLastWorkspacePath keeps recents", () => {
		rememberWorkspacePath("/ws/a");
		clearLastWorkspacePath();
		expect(readLastWorkspacePath()).toBeNull();
		expect(readRecentWorkspacePaths()).toEqual(["/ws/a"]);
	});
});
