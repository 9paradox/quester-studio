/**
 * Run the same script across workspace packages; stop on first failure.
 * Usage: bun scripts/workspace-run.mjs <script>
 */
import { spawnSync } from "node:child_process";

const script = process.argv[2];
if (!script) {
	console.error("usage: bun scripts/workspace-run.mjs <script>");
	process.exit(2);
}

const packages = [
	"@quester-studio/schema",
	"@quester-studio/nodes",
	"@quester-studio/engine",
	"@quester-studio/mcp",
	"@quester-studio/cli",
	"@quester-studio/api-contract",
	"@quester-studio/workspace-service",
	"@quester-studio/api",
	"@quester-studio/desktop",
];

for (const pkg of packages) {
	console.log(`\n==> ${pkg} ${script}\n`);
	const result = spawnSync("bun", ["run", "--filter", pkg, script], {
		stdio: "inherit",
		shell: true,
	});
	const code = result.status ?? 1;
	if (code !== 0) {
		console.error(`\n${script} failed at: ${pkg} (exit ${code})\n`);
		process.exit(code);
	}
}
