import { execFileSync, execSync } from "node:child_process";
/**
 * After Electrobun `build --env=stable|canary`, produce user-facing Windows packages:
 * - portable zip (extract anywhere, run bin/launcher.exe)
 * - NSIS setup.exe (choose folder + Settings → Apps uninstall)
 *
 * Skips on non-Windows. Portable always; NSIS required when CI=true or REQUIRE_NSIS=1.
 */
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = join(__dirname, "..");
const artifactDir = process.env.ELECTROBUN_ARTIFACT_DIR
	? process.env.ELECTROBUN_ARTIFACT_DIR
	: join(desktopRoot, "artifacts");
const buildEnv = process.env.ELECTROBUN_BUILD_ENV || "stable";
const appDisplayName = "Quester";
const appFileName =
	buildEnv === "stable" ? appDisplayName : `${appDisplayName}-${buildEnv}`;
const platformPrefix = `${buildEnv}-win-x64`;

function readVersion() {
	const pkg = JSON.parse(
		readFileSync(join(desktopRoot, "package.json"), "utf8"),
	);
	return String(pkg.version || "0.0.0");
}

function resolveZigZstd() {
	const candidates = [
		join(
			desktopRoot,
			"node_modules",
			"electrobun",
			"dist-win-x64",
			"zig-zstd.exe",
		),
		join(
			desktopRoot,
			"..",
			"..",
			"node_modules",
			"electrobun",
			"dist-win-x64",
			"zig-zstd.exe",
		),
	];
	for (const p of candidates) {
		if (existsSync(p)) return p;
	}
	throw new Error(
		"[package-windows] zig-zstd.exe not found under electrobun dist-win-x64",
	);
}

function findMakensis() {
	const fromEnv = process.env.MAKENSIS;
	if (fromEnv && existsSync(fromEnv)) return fromEnv;
	try {
		const out = execFileSync("where.exe", ["makensis"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
		const first = out.split(/\r?\n/)[0]?.trim();
		if (first && existsSync(first)) return first;
	} catch {
		// not on PATH
	}
	const programFiles = [
		process.env.ProgramFiles,
		process.env["ProgramFiles(x86)"],
	].filter(Boolean);
	for (const root of programFiles) {
		const candidate = join(root, "NSIS", "makensis.exe");
		if (existsSync(candidate)) return candidate;
	}
	return null;
}

function requireNsis() {
	return process.env.CI === "true" || process.env.REQUIRE_NSIS === "1";
}

function findAppTarball() {
	const expected = join(
		artifactDir,
		`${platformPrefix}-${appFileName}.tar.zst`,
	);
	if (existsSync(expected)) return expected;
	if (!existsSync(artifactDir)) {
		throw new Error(
			`[package-windows] artifacts folder missing: ${artifactDir}`,
		);
	}
	const matches = readdirSync(artifactDir).filter(
		(name) =>
			name.startsWith(`${platformPrefix}-`) &&
			name.endsWith(".tar.zst") &&
			!name.includes("Setup") &&
			!name.includes("prev"),
	);
	if (matches.length === 1) return join(artifactDir, matches[0]);
	throw new Error(
		`[package-windows] App tarball not found (expected ${expected}). Found: ${matches.join(", ") || "(none)"}`,
	);
}

function extractAppBundle(tarballZst, workDir) {
	const zstd = resolveZigZstd();
	const tarPath = join(workDir, "app.tar");
	console.log(`[package-windows] Decompressing ${tarballZst}`);
	execFileSync(zstd, ["decompress", "-i", tarballZst, "-o", tarPath], {
		stdio: "inherit",
	});
	console.log("[package-windows] Extracting tar...");
	execFileSync("tar", ["-xf", tarPath, "-C", workDir], { stdio: "inherit" });
	const appDir = join(workDir, appFileName);
	if (!existsSync(appDir)) {
		const kids = readdirSync(workDir).filter((n) => n !== "app.tar");
		throw new Error(
			`[package-windows] Expected app folder ${appFileName}, found: ${kids.join(", ")}`,
		);
	}
	const launcher = join(appDir, "bin", "launcher.exe");
	if (!existsSync(launcher)) {
		throw new Error(`[package-windows] Missing launcher at ${launcher}`);
	}
	return appDir;
}

function writePortableReadme(appDir, version) {
	const text = `${appDisplayName} ${version} (portable)

1. Keep this folder wherever you like.
2. Double-click bin\\launcher.exe to start ${appDisplayName}.
3. To remove ${appDisplayName}, delete this whole folder.

Workspaces you create or open are separate folders and are not removed with the app.
`;
	writeFileSync(join(appDir, "README.txt"), text);
}

function createPortableZip(appDir, version) {
	const zipName = `${appDisplayName}-${version}-win-x64-portable.zip`;
	const zipPath = join(artifactDir, zipName);
	if (existsSync(zipPath)) rmSync(zipPath);
	// Stage as Quester/ so unzip shows a clear top-level folder
	const stage = join(dirname(appDir), "portable-stage");
	rmSync(stage, { recursive: true, force: true });
	mkdirSync(stage, { recursive: true });
	const stagedApp = join(stage, appDisplayName);
	cpSync(appDir, stagedApp, { recursive: true });
	console.log(`[package-windows] Creating portable zip ${zipName}`);
	execSync(
		`powershell -NoProfile -Command "Compress-Archive -Path '${stage}\\*' -DestinationPath '${zipPath}' -Force"`,
		{ stdio: "inherit" },
	);
	rmSync(stage, { recursive: true, force: true });
	if (!existsSync(zipPath)) {
		throw new Error(`[package-windows] Failed to create ${zipPath}`);
	}
	console.log(`[package-windows] Wrote ${zipPath}`);
	return zipPath;
}

function createNsisInstaller(appDir, version) {
	const makensis = findMakensis();
	if (!makensis) {
		const msg =
			"[package-windows] NSIS (makensis) not found — skipping setup.exe. Install NSIS or set MAKENSIS.";
		if (requireNsis()) {
			throw new Error(msg);
		}
		console.warn(msg);
		return null;
	}
	const outName = `${appDisplayName}-${version}-win-x64-setup.exe`;
	const outPath = join(artifactDir, outName);
	if (existsSync(outPath)) rmSync(outPath);
	const nsi = join(__dirname, "windows", "installer.nsi");
	console.log(`[package-windows] Compiling NSIS installer → ${outName}`);
	execFileSync(
		makensis,
		[
			`/DSOURCE_DIR=${appDir}`,
			`/DAPP_VERSION=${version}`,
			`/DOUTFILE=${outPath}`,
			nsi,
		],
		{ stdio: "inherit" },
	);
	if (!existsSync(outPath)) {
		throw new Error(`[package-windows] NSIS did not produce ${outPath}`);
	}
	console.log(`[package-windows] Wrote ${outPath}`);
	return outPath;
}

function main() {
	if (process.platform !== "win32") {
		console.log("[package-windows] Skipping (not Windows)");
		return;
	}

	const version = readVersion();
	const tarball = findAppTarball();
	mkdirSync(artifactDir, { recursive: true });

	const workDir = mkdtempSync(join(tmpdir(), "quester-win-pkg-"));
	try {
		const appDir = extractAppBundle(tarball, workDir);
		writePortableReadme(appDir, version);
		createPortableZip(appDir, version);
		createNsisInstaller(appDir, version);
	} finally {
		rmSync(workDir, { recursive: true, force: true });
	}
}

main();
