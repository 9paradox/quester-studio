import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type McpServerStatus = {
	running: boolean;
	workspace: string | null;
	pid: number | null;
	error: string | null;
};

type StatusListener = (status: McpServerStatus) => void;

let child: ChildProcess | null = null;
let currentWorkspace: string | null = null;
let lastError: string | null = null;
const listeners = new Set<StatusListener>();

function emit(status: McpServerStatus) {
	for (const listener of listeners) {
		listener(status);
	}
}

export function onMcpServerStatus(listener: StatusListener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function getMcpServerStatus(): McpServerStatus {
	const running = Boolean(child && child.exitCode === null && !child.killed);
	return {
		running,
		workspace: running ? currentWorkspace : null,
		pid: running && child?.pid != null ? child.pid : null,
		error: lastError,
	};
}

function walkForCliJs(startDir: string, maxUp = 10): string | null {
	let dir = resolve(startDir);
	for (let i = 0; i < maxUp; i++) {
		const candidate = join(dir, "packages", "cli", "dist", "cli.js");
		if (existsSync(candidate)) return candidate;
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return null;
}

/**
 * Locate packages/cli/dist/cli.js from monorepo checkout.
 * Electrobun often runs from a bundled dir — search cwd, workspace, and module path.
 */
export function resolveMonorepoCliJs(workspace?: string): string | null {
	const envCli = process.env.QUESTER_CLI_JS;
	if (envCli && existsSync(envCli)) return resolve(envCli);

	const envRoot = process.env.QUESTER_REPO_ROOT;
	if (envRoot) {
		const fromEnv = join(resolve(envRoot), "packages", "cli", "dist", "cli.js");
		if (existsSync(fromEnv)) return fromEnv;
	}

	const starts: string[] = [];
	if (workspace) starts.push(resolve(workspace));
	starts.push(process.cwd());
	try {
		starts.push(dirname(fileURLToPath(import.meta.url)));
	} catch {
		/* ignore */
	}

	for (const start of starts) {
		const found = walkForCliJs(start);
		if (found) return found;
	}
	return null;
}

/** Resolve a runnable bun binary (Windows-friendly). */
export function resolveBunExecutable(): string | null {
	const envBun = process.env.BUN_INSTALL
		? join(
				process.env.BUN_INSTALL,
				"bin",
				process.platform === "win32" ? "bun.exe" : "bun",
			)
		: null;
	const candidates = [
		process.env.QUESTER_BUN,
		envBun,
		process.platform === "win32"
			? join(homedir(), ".bun", "bin", "bun.exe")
			: join(homedir(), ".bun", "bin", "bun"),
		process.platform === "win32" ? "bun.exe" : "bun",
		"bun",
	].filter((x): x is string => Boolean(x));

	for (const c of candidates) {
		if (c === "bun" || c === "bun.exe") continue; // PATH — try last via shell
		if (existsSync(c)) return c;
	}
	return process.platform === "win32" ? "bun.exe" : "bun";
}

export function spawnCommand(workspace: string): {
	command: string;
	args: string[];
	shell: boolean;
} {
	const abs = resolve(workspace);
	const cliJs = resolveMonorepoCliJs(abs);
	if (cliJs) {
		const bun = resolveBunExecutable() ?? "bun";
		return {
			command: bun,
			args: [cliJs, "mcp", "serve", "--workspace", abs],
			// Absolute bun.exe: no shell. PATH name: use shell on Windows.
			shell: bun === "bun" || bun === "bun.exe",
		};
	}

	// Published install: try `quester` via shell so .cmd resolves on Windows.
	return {
		command: "quester",
		args: ["mcp", "serve", "--workspace", abs],
		shell: true,
	};
}

export async function startMcpServer(
	workspace: string,
): Promise<McpServerStatus> {
	const root = resolve(workspace);
	await stopMcpServer();
	lastError = null;
	const { command, args, shell } = spawnCommand(root);

	try {
		// Keep stdin open (pipe). Stdio MCP servers exit immediately on EOF —
		// `ignore` closes stdin and looks like a clean start-then-Off flop.
		const proc = spawn(command, args, {
			cwd: root,
			stdio: ["pipe", "ignore", "pipe"],
			windowsHide: true,
			shell,
			env: { ...process.env },
		});
		child = proc;
		currentWorkspace = root;

		proc.stderr?.on("data", (buf: Buffer) => {
			const text = buf.toString("utf8").trim();
			if (text) console.error(`[mcp serve] ${text}`);
		});

		proc.on("error", (err) => {
			const hint =
				err.message.includes("ENOENT") || err.message.includes("uv_spawn")
					? ` — build the CLI (bun run --filter @quester-studio/cli build) or set QUESTER_CLI_JS / install quester on PATH. Tried: ${command} ${args.join(" ")}`
					: "";
			lastError = `${err.message}${hint}`;
			if (child === proc) {
				child = null;
				currentWorkspace = null;
			}
			emit(getMcpServerStatus());
		});

		proc.on("exit", (code, signal) => {
			if (child === proc) {
				child = null;
				currentWorkspace = null;
				if (code !== 0 && code !== null) {
					lastError = `MCP server exited (code ${code}${signal ? `, signal ${signal}` : ""})`;
				}
			}
			emit(getMcpServerStatus());
		});

		// Brief settle — fail fast if spawn dies immediately
		await new Promise((r) => setTimeout(r, 200));
		if (!child || child.exitCode !== null) {
			lastError =
				lastError ??
				`Failed to start MCP server (${command} ${args.join(" ")})`;
			child = null;
			currentWorkspace = null;
		}
	} catch (err) {
		lastError = err instanceof Error ? err.message : String(err);
		child = null;
		currentWorkspace = null;
	}

	const status = getMcpServerStatus();
	emit(status);
	return status;
}

export async function stopMcpServer(): Promise<McpServerStatus> {
	const proc = child;
	child = null;
	currentWorkspace = null;
	if (proc && proc.exitCode === null) {
		await new Promise<void>((resolveDone) => {
			const timer = setTimeout(() => {
				try {
					proc.kill("SIGKILL");
				} catch {
					/* ignore */
				}
				resolveDone();
			}, 2000);
			proc.once("exit", () => {
				clearTimeout(timer);
				resolveDone();
			});
			try {
				proc.kill(process.platform === "win32" ? undefined : "SIGTERM");
			} catch {
				clearTimeout(timer);
				resolveDone();
			}
		});
	}
	const status = getMcpServerStatus();
	emit(status);
	return status;
}
