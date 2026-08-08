/**
 * Fail-fast gate: lint → typecheck → test.
 * Use `bun run check` instead of chaining with `;` (PowerShell masks early failures).
 */
import { spawnSync } from "node:child_process";

const steps = [
	{ name: "lint", bunArgs: ["run", "lint"] },
	{ name: "typecheck", bunArgs: ["run", "typecheck"] },
	{ name: "test", bunArgs: ["run", "test"] },
];

for (const step of steps) {
	console.log(`\n==> ${step.name}\n`);
	const result = spawnSync("bun", step.bunArgs, {
		stdio: "inherit",
		shell: true,
	});
	const code = result.status ?? 1;
	if (code !== 0) {
		console.error(`\ncheck failed at: ${step.name} (exit ${code})\n`);
		process.exit(code);
	}
}

console.log("\ncheck passed\n");
