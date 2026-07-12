/** Serialize unknown errors for console/logs (includes Bun fetch TLS fields). */
export function serializeError(error: unknown): {
	message: string;
	detail: Record<string, unknown>;
} {
	if (error instanceof Error) {
		const e = error as Error & {
			code?: unknown;
			path?: unknown;
			errno?: unknown;
			cause?: unknown;
		};
		const detail: Record<string, unknown> = {
			name: e.name,
			message: e.message,
		};
		if (typeof e.code === "string" || typeof e.code === "number") {
			detail.code = e.code;
		}
		if (typeof e.path === "string") detail.path = e.path;
		if (typeof e.errno === "number") detail.errno = e.errno;
		if (e.stack) detail.stack = e.stack;
		if (e.cause !== undefined) {
			detail.cause = serializeError(e.cause).detail;
		}
		return { message: e.message, detail };
	}
	return { message: String(error), detail: { value: error } };
}

export function formatErrorForConsole(error: unknown): string {
	const { message, detail } = serializeError(error);
	const lines = [message];
	if (typeof detail.code === "string" || typeof detail.code === "number") {
		lines.push(`code: ${detail.code}`);
	}
	if (typeof detail.path === "string") {
		lines.push(`url: ${detail.path}`);
	}
	if (detail.stack && typeof detail.stack === "string") {
		lines.push(detail.stack);
	}
	return lines.join("\n");
}

export function isTlsCertificateError(error: unknown): boolean {
	const { message, detail } = serializeError(error);
	const code = String(detail.code ?? "");
	const hay = `${message} ${code}`.toLowerCase();
	return (
		hay.includes("certificate") ||
		hay.includes("cert_") ||
		code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
		code === "CERT_HAS_EXPIRED" ||
		code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
		code === "SELF_SIGNED_CERT_IN_CHAIN"
	);
}

export const TLS_INSECURE_HINT =
	"TLS certificate verification failed. Fix your system CA store, or restart the desktop app with QUESTR_INSECURE_TLS=1 (dev only — disables HTTPS verification).";
