import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { CookieJar, type CookieJarSnapshot } from "@quester-studio/engine";

const COOKIES_FILE = "cookies.json";

export function cookiesFilePath(workspace: string): string {
	const root = resolve(workspace);
	const file = join(root, ".quester", COOKIES_FILE);
	const resolved = resolve(file);
	if (!resolved.startsWith(root)) {
		throw new Error("Invalid cookies path");
	}
	return resolved;
}

export async function loadPersistedCookieJar(
	workspace: string,
): Promise<CookieJar | undefined> {
	try {
		const raw = JSON.parse(
			await readFile(cookiesFilePath(workspace), "utf8"),
		) as {
			version?: number;
			hosts?: CookieJarSnapshot;
		};
		if (raw?.hosts && typeof raw.hosts === "object") {
			return CookieJar.fromSnapshot(raw.hosts);
		}
	} catch {
		// missing or unreadable file — start with an empty jar
	}
	return undefined;
}

/** SECURITY: session cookies are stored in plaintext; keep the workspace private. */
export async function savePersistedCookieJar(
	workspace: string,
	jar: CookieJar,
): Promise<void> {
	const file = cookiesFilePath(workspace);
	await mkdir(dirname(file), { recursive: true });
	const hosts = jar.toSnapshot();
	await writeFile(
		file,
		`${JSON.stringify({ version: 1, hosts }, null, 2)}\n`,
		"utf8",
	);
}
