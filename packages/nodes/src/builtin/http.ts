import { httpNodeDataSchema } from "@quester/schema";
import type { FlowNodePlugin } from "../types.js";
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

export const httpPlugin: FlowNodePlugin = {
	type: "http",
	async execute(ctx) {
		const data = httpNodeDataSchema.parse(ctx.node.data);
		const url = ctx.resolveTemplate(data.url);
		assertHttpUrl(url);
		const headers: Record<string, string> = {};
		for (const [k, v] of Object.entries(data.headers)) {
			headers[k] = ctx.resolveTemplate(v);
		}
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
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new HttpNodeError(message, request, error);
		}
		const endedAt = Date.now();
		const text = await res.text();
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
			size: new TextEncoder().encode(text).length,
		};

		return { output };
	},
};
