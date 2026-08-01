/**
 * Copy repo examples/sample-workspace into apps/desktop/bundled/sample-workspace
 * so Electrobun can ship it under Resources/sample-workspace.
 */
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = join(__dirname, "..");
const repoRoot = join(desktopRoot, "..", "..");
const source = join(repoRoot, "examples", "sample-workspace");
const dest = join(desktopRoot, "bundled", "sample-workspace");

if (!existsSync(join(source, "quester.json"))) {
	console.error(`[sync-sample-workspace] Missing sample at ${source}`);
	process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(source, dest, {
	recursive: true,
	filter: (src) => {
		const base = src.replace(/\\/g, "/");
		if (base.endsWith("/.gitignore")) return false;
		if (base.includes("/.quester/")) return false;
		return true;
	},
});
console.log(`[sync-sample-workspace] Synced → ${dest}`);
