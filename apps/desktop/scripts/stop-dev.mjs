import { execSync } from "node:child_process";
import { VITE_DEV_PORT } from "./dev-constants.mjs";

const processNames = ["launcher", "electrobun"];

function run(command) {
	try {
		execSync(command, { stdio: "ignore", shell: true });
	} catch {
		// Process or port may already be free.
	}
}

if (process.platform === "win32") {
	for (let port = VITE_DEV_PORT; port < VITE_DEV_PORT + 10; port++) {
		run(
			`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
		);
	}
	for (const name of processNames) {
		run(`taskkill /F /IM ${name}.exe /T 2>nul`);
	}
} else {
	run(`lsof -ti :${VITE_DEV_PORT}-${VITE_DEV_PORT + 9} | xargs -r kill -9`);
	for (const name of processNames) {
		run(`pkill -f ${name} || true`);
	}
}
