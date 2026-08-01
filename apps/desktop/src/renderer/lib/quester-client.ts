import type { QuesterClient } from "@quester-studio/api-contract";

let client: QuesterClient | null = null;

/** Register the transport (Electrobun RPC or HTTP) before the app store runs. */
export function setQuesterClient(next: QuesterClient): void {
	client = next;
}

export function getQuesterClient(): QuesterClient {
	if (!client) {
		throw new Error(
			"QuesterClient is not initialized. Call setQuesterClient() from the app entry.",
		);
	}
	return client;
}

/** Test helper */
export function resetQuesterClientForTests(): void {
	client = null;
}
