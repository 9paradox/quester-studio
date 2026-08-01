/**
 * Stub for Vite web builds so accidental imports of electrobun/view do not fail.
 */
export class Electroview {
	static defineRPC() {
		throw new Error(
			"Electrobun is not available in web mode. Use VITE_QUESTER_API_URL / HttpQuesterClient.",
		);
	}
	rpc = null;
}
