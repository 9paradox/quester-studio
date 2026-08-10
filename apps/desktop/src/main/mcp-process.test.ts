import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
	resolveBunExecutable,
	resolveMonorepoCliJs,
	spawnCommand,
} from "./mcp-process.js";

const repoRoot = resolve(import.meta.dir, "../../../..");
const sampleWorkspace = resolve(repoRoot, "examples/sample-workspace");

describe("mcp-process resolve", () => {
	test("finds CLI from workspace path", () => {
		const cli = resolveMonorepoCliJs(sampleWorkspace);
		expect(cli).toBeTruthy();
		expect(cli?.replace(/\\/g, "/")).toContain("packages/cli/dist/cli.js");
	});

	test("spawnCommand prefers bun + cli.js", () => {
		const cmd = spawnCommand(sampleWorkspace);
		expect(cmd.args[0]?.replace(/\\/g, "/")).toContain(
			"packages/cli/dist/cli.js",
		);
		expect(cmd.args).toContain("mcp");
		expect(cmd.args).toContain("serve");
		expect(resolveBunExecutable()).toBeTruthy();
	});
});
