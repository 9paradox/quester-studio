import { httpNodeDataSchema, isCookieJarEnabled } from "@quester-studio/schema";
import type { CookieJar } from "../cookie-jar.js";
import type { FlowNodePlugin } from "../types.js";
import {
	HTTP_AUTH_HEADERS_VAR,
	HTTP_AUTH_QUERY_VAR,
	applyAuthQuery,
	asStringRecord,
	setHeaderCaseInsensitive,
} from "./http-auth-vars.js";
import { assertHttpUrl } from "./validate-http-url.js";

export type HttpRequestSnapshot = {
	method: string;
	url: string;
	headers: Record<string, string>;
	body?: string;
};

export type HttpNodeOutput = {
	/** @deprecated prefer response.status — kept for {{nodes.id.body}} templates */
	status: number;
	statusText: string;
	headers: Record<string, string>;
	body: unknown;
	text: string;
	request: HttpRequestSnapshot;
	timing: {
		startedAt: number;
		endedAt: number;
		durationMs: number;
	};
	size: number;
};

export class HttpNodeError extends Error {
	readonly request: HttpRequestSnapshot;

	constructor(message: string, request: HttpRequestSnapshot, cause?: unknown) {
		super(message);
		this.name = "HttpNodeError";
		this.request = request;
		if (cause !== undefined) {
			(this as Error & { cause?: unknown }).cause = cause;
		}
	}
}

export async function readResponseTextLimited(
	res: Response,
	maxBytes: number | undefined,
): Promise<{ text: string; size: number }> {
	const unlimited = maxBytes === undefined || maxBytes === 0;
	const contentLength = res.headers.get("content-length");
	if (
		!unlimited &&
		contentLength !== null &&
		Number(contentLength) > (maxBytes as number)
	) {
		throw new Error(
			`Response Content-Length ${contentLength} exceeds maxResponseBytes (${maxBytes})`,
		);
	}

	if (unlimited || !res.body) {
		const text = await res.text();
		return { text, size: new TextEncoder().encode(text).length };
	}

	const reader = res.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (!value) continue;
		size += value.byteLength;
		if (size > (maxBytes as number)) {
			await reader.cancel();
			throw new Error(`Response body exceeds maxResponseBytes (${maxBytes})`);
		}
		chunks.push(value);
	}
	const merged = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		merged.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return { text: new TextDecoder().decode(merged), size };
}

function collectSetCookie(headers: Headers): string[] {
	const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] })
		.getSetCookie;
	if (typeof getSetCookie === "function") return getSetCookie.call(headers);
	const out: string[] = [];
	headers.forEach((value, key) => {
		if (key.toLowerCase() === "set-cookie") out.push(value);
	});
	return out;
}

export const httpPlugin: FlowNodePlugin = {
	type: "http",
	async execute(ctx) {
		const data = httpNodeDataSchema.parse(ctx.node.data);
		let url = ctx.resolveTemplate(data.url);
		const inheritAuth = !data.skipInheritedAuth;
		const authQuery = inheritAuth
			? asStringRecord(ctx.vars[HTTP_AUTH_QUERY_VAR])
			: {};
		if (Object.keys(authQuery).length > 0) {
			try {
				url = applyAuthQuery(url, authQuery);
			} catch {
				// invalid URL — assertHttpUrl below
			}
		}
		assertHttpUrl(url);

		const headers: Record<string, string> = {};
		const defaults = ctx.httpDefaults?.defaultHeaders ?? {};
		for (const [k, v] of Object.entries(defaults)) {
			setHeaderCaseInsensitive(headers, k, ctx.resolveTemplate(v));
		}
		if (inheritAuth) {
			for (const [k, v] of Object.entries(
				asStringRecord(ctx.vars[HTTP_AUTH_HEADERS_VAR]),
			)) {
				setHeaderCaseInsensitive(headers, k, v);
			}
		}
		for (const [k, v] of Object.entries(data.headers)) {
			setHeaderCaseInsensitive(headers, k, ctx.resolveTemplate(v));
		}

		const jar: CookieJar | undefined =
			isCookieJarEnabled(ctx.httpDefaults) && ctx.cookieJar
				? ctx.cookieJar
				: undefined;
		jar?.applyToHeaders(url, headers);

		let body: string | undefined;
		if (data.body !== undefined) {
			body =
				typeof data.body === "string"
					? ctx.resolveTemplate(data.body)
					: ctx.resolveTemplate(JSON.stringify(data.body));
		}

		const request: HttpRequestSnapshot = {
			method: data.method,
			url,
			headers,
			...(body !== undefined ? { body } : {}),
		};

		const timeoutMs = ctx.httpDefaults?.timeoutMs;
		const signal =
			timeoutMs !== undefined && timeoutMs > 0
				? AbortSignal.timeout(timeoutMs)
				: undefined;

		const startedAt = Date.now();
		let res: Response;
		try {
			res = await ctx.fetch(url, {
				method: data.method,
				headers,
				body:
					body && data.method !== "GET" && data.method !== "HEAD"
						? body
						: undefined,
				...(signal ? { signal } : {}),
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new HttpNodeError(message, request, error);
		}
		const endedAt = Date.now();

		let text: string;
		let size: number;
		try {
			({ text, size } = await readResponseTextLimited(
				res,
				ctx.httpDefaults?.maxResponseBytes,
			));
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new HttpNodeError(message, request, error);
		}

		if (jar) {
			const storeUrl = res.url || url;
			jar.storeFromSetCookie(storeUrl, collectSetCookie(res.headers));
		}

		let json: unknown = text;
		try {
			json = JSON.parse(text);
		} catch {
			// keep text
		}

		const responseHeaders: Record<string, string> = {};
		res.headers.forEach((value, key) => {
			responseHeaders[key] = value;
		});

		const output: HttpNodeOutput = {
			status: res.status,
			statusText: res.statusText,
			headers: responseHeaders,
			body: json,
			text,
			request,
			timing: {
				startedAt,
				endedAt,
				durationMs: endedAt - startedAt,
			},
			size,
		};

		return { output, processedInput: request };
	},
};
