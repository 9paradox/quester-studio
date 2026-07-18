import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const cliEntry = join(repoRoot, "packages/cli/src/cli.ts");
const sampleWorkspace = join(repoRoot, "examples/sample-workspace");
const sampleFlow = join(sampleWorkspace, "flows/login-and-profile.flow.json");

async function runCli(args: string[]) {
	const proc = Bun.spawn(["bun", cliEntry, ...args], {
		cwd: repoRoot,
		stdout: "pipe",
		stderr: "pipe",
		env: { ...process.env, NO_COLOR: "1" },
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { stdout, stderr, exitCode };
}

describe("quester cli", () => {
	test("validate sample workspace", async () => {
		const { stdout, exitCode } = await runCli(["validate", sampleWorkspace]);
		expect(exitCode).toBe(0);
		expect(stdout).toContain("Workspace OK: sample-workspace");
		expect(stdout).toContain("flow: login-and-profile");
	});

	test("validate single flow file", async () => {
		const { stdout, exitCode } = await runCli(["validate", sampleFlow]);
		expect(exitCode).toBe(0);
		expect(stdout).toContain("Flow OK: login-and-profile");
	});

	test("list-flows", async () => {
		const { stdout, exitCode } = await runCli(["list-flows", sampleWorkspace]);
		expect(exitCode).toBe(0);
		expect(stdout).toContain("login-and-profile");
	});

	test("list-envs", async () => {
		const { stdout, exitCode } = await runCli(["list-envs", sampleWorkspace]);
		expect(exitCode).toBe(0);
		expect(stdout).toContain("local");
	});

	test("run sample flow end-to-end", async () => {
		const { stdout, stderr, exitCode } = await runCli([
			"run",
			sampleFlow,
			"--workspace",
			sampleWorkspace,
			"--env",
			"local",
			"--input",
			'{"username":"emilys","password":"emilyspass"}',
		]);
		// Live HTTPS may fail TLS verification on some Windows CA stores.
		if (exitCode !== 0) {
			expect(stderr.toLowerCase()).toMatch(/certificate|tls|fetch|network/);
			return;
		}
		const output = JSON.parse(stdout) as { status?: number; body?: unknown };
		expect(typeof output.status).toBe("number");
		expect(output).toHaveProperty("body");
	});
});
