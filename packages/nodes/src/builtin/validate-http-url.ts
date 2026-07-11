export function assertHttpUrl(url: string): void {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new Error(`Invalid HTTP URL: ${url}`);
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		throw new Error(
			`HTTP node URL must use http or https scheme, got: ${parsed.protocol}`,
		);
	}
	if (!parsed.hostname) {
		throw new Error("HTTP node URL must have a host");
	}
}
