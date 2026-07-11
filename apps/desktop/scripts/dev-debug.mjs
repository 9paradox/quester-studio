import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { VITE_DEV_PORT, VITE_DEV_URL } from "./dev-constants.mjs";

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const hmr = process.argv.includes("--hmr");
const env = {
	...process.env,
	...(hmr ? { ELECTROBUN_HMR: "1" } : {}),
	DEV: "1",
};

function run(command, args = []) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: desktopRoot,
			env,
			stdio: "inherit",
		});
		child.on("exit", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${command} exited with code ${code}`));
		});
	});
}

function runBackground(command, args = []) {
	const child = spawn(command, args, {
		cwd: desktopRoot,
		env,
		stdio: "inherit",
	});
	child.on("exit", (code) => process.exit(code ?? 0));
}

await import("./stop-dev.mjs");

if (hmr) {
	runBackground("bun", [
		"x",
		"concurrently",
		`vite --host 127.0.0.1 --port ${VITE_DEV_PORT} --strictPort`,
		"vite build && bun --inspect-wait=6499 x electrobun dev",
	]);
} else {
	try {
		await run("bun", ["x", "vite", "build"]);
		runBackground("bun", ["--inspect-wait=6499", "x", "electrobun", "dev"]);
	} catch (err) {
		console.error(err instanceof Error ? err.message : err);
		process.exit(1);
	}
}
