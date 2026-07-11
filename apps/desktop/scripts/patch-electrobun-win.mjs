import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "win32") {
	process.exit(0);
}

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const broken = `    const wrappedFileData = \`
// Auto-delete temp file after Worker loads it
const __tempFilePath = "\${appEntrypointPath}";`;

const fixed = `    const escapedEntrypointPath = appEntrypointPath.replace(/\\\\/g, "\\\\\\\\");
    const wrappedFileData = \`
// Auto-delete temp file after Worker loads it
const __tempFilePath = "\${escapedEntrypointPath}";`;

function patchLauncher(path) {
	if (!existsSync(path)) return false;

	const source = readFileSync(path, "utf8");
	if (source.includes("escapedEntrypointPath")) return true;
	if (!source.includes(broken)) {
		console.warn(`[patch-electrobun-win] Unrecognized launcher at ${path}`);
		return false;
	}

	writeFileSync(path, source.replace(broken, fixed));
	console.log(`[patch-electrobun-win] Patched ${path}`);
	return true;
}

const launcherPaths = [
	join(desktopRoot, "node_modules", "electrobun", "dist", "main.js"),
	join(desktopRoot, "node_modules", "electrobun", "dist-win-x64", "main.js"),
	join(
		desktopRoot,
		"build",
		"dev-win-x64",
		"Quester-dev",
		"Resources",
		"main.js",
	),
];

let patched = 0;
for (const path of launcherPaths) {
	if (patchLauncher(path)) patched++;
}

if (patched === 0) {
	console.warn(
		"[patch-electrobun-win] No Electrobun launcher files were patched",
	);
}
