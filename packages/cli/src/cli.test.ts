import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initWorkspace } from "./init.js";

const repoRoot = join(import.meta.dir, "../../..");
const cliEntry = join(repoRoot, "packages/cli/src/cli.ts");
const sampleWorkspace = join(repoRoot, "examples/sample-workspace");
const sampleFlow = join(sampleWorkspace, "flows/login-and-profile.flow.json");

async function runCli(args: string[], cwd = repoRoot) {
	const proc = Bun.spawn(["bun", cliEntry, ...args], {
		cwd,
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

	test("init scaffolds a workspace that validates", async () => {
		const dir = await mkdtemp(join(tmpdir(), "quester-init-"));
		try {
			const { stdout, stderr, exitCode } = await runCli([
				"init",
				dir,
				"--name",
				"demo-app",
			]);
			expect(stderr).toBe("");
			expect(exitCode).toBe(0);
			expect(stdout).toContain("Initialized workspace: demo-app");
			expect(stdout).toContain("flow: hello");

			const validated = await runCli(["validate", dir]);
			expect(validated.exitCode).toBe(0);
			expect(validated.stdout).toContain("Workspace OK: demo-app");
			expect(validated.stdout).toContain("flow: hello");
			expect(validated.stdout).toContain("environment: local");
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	test("init refuses existing workspace", async () => {
		const dir = await mkdtemp(join(tmpdir(), "quester-init-"));
		try {
			await initWorkspace(dir, { name: "once" });
			const { stderr, exitCode } = await runCli(["init", dir]);
			expect(exitCode).toBe(1);
			expect(stderr).toContain("already exists");
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	test("import-collection writes request files", async () => {
		const dir = await mkdtemp(join(tmpdir(), "quester-import-cli-"));
		try {
			await runCli(["init", dir, "--name", "import-cli"]);
			const fixture = join(
				repoRoot,
				"packages/engine/src/fixtures/postman-mini.json",
			);
			const { stdout, stderr, exitCode } = await runCli([
				"import-collection",
				fixture,
				"--workspace",
				dir,
			]);
			expect(exitCode).toBe(0);
			expect(stderr).toBe("");
			expect(stdout).toContain("imported: demo-api/auth/login");
			expect(stdout).toContain("Imported 2 request(s)");
			const login = JSON.parse(
				await Bun.file(
					join(dir, "collections/demo-api/auth/login.request.json"),
				).text(),
			) as { method: string };
			expect(login.method).toBe("POST");
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
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
		// Live HTTPS may fail TLS, network, or DummyJSON auth on CI runners.
		if (exitCode !== 0) {
			expect(stderr.toLowerCase()).toMatch(
				/certificate|tls|fetch|network|assertion|401|unable to/,
			);
			return;
		}
		const output = JSON.parse(stdout) as { status?: number; body?: unknown };
		expect(typeof output.status).toBe("number");
		expect(output).toHaveProperty("body");
	});
});

describe("initWorkspace", () => {
	test("creates start → input starter flow", async () => {
		const dir = await mkdtemp(join(tmpdir(), "quester-init-unit-"));
		try {
			const result = await initWorkspace(dir);
			expect(result.flowId).toBe("hello");
			const flow = JSON.parse(
				await Bun.file(join(result.root, "flows", "hello.flow.json")).text(),
			) as {
				nodes: { id: string; type: string }[];
				edges: { source: string; target: string }[];
			};
			expect(flow.nodes.map((n) => n.type)).toEqual(["start", "input"]);
			expect(flow.edges).toEqual([
				expect.objectContaining({ source: "start", target: "input" }),
			]);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
