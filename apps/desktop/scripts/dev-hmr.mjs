import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { VITE_DEV_PORT } from "./dev-constants.mjs";

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env, ELECTROBUN_HMR: "1" };

await import("./stop-dev.mjs");

const child = spawn(
	"bun",
	[
		"x",
		"concurrently",
		`vite --host 127.0.0.1 --port ${VITE_DEV_PORT} --strictPort`,
		"vite build && electrobun dev",
	],
	{
		cwd: desktopRoot,
		env,
		stdio: "inherit",
	},
);

child.on("exit", (code) => process.exit(code ?? 0));
