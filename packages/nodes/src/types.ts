import type { FlowNodeV1, HttpSettingsV1 } from "@quester/schema";
import type { CookieJar } from "./cookie-jar.js";

export type NodeExecutionContext = {
	node: FlowNodeV1;
	input: unknown;
	flowInput: unknown;
	vars: Record<string, unknown>;
	nodeOutputs: Record<string, unknown>;
	resolveTemplate: (template: string) => string;
	fetch: typeof fetch;
	/** Resolved workspace→flow HTTP defaults (headers merged; timeout inherited). */
	httpDefaults?: HttpSettingsV1;
	/** In-run cookie jar shared across HTTP hops (when enabled). */
	cookieJar?: CookieJar;
};

export type NodeExecutionResult = {
	output: unknown;
	branch?: "true" | "false";
	vars?: Record<string, unknown>;
};

export interface FlowNodePlugin {
	type: string;
	execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult>;
}
