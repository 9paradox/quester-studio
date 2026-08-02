import type { FlowNodeV1, HttpSettingsV1 } from "@quester-studio/schema";
import type { CookieJar } from "./cookie-jar.js";

export type NodeExecutionContext = {
	node: FlowNodeV1;
	input: unknown;
	flowInput: unknown;
	vars: Record<string, unknown>;
	nodeOutputs: Record<string, unknown>;
	resolveTemplate: (template: string) => string;
	fetch: typeof fetch;
	/** When aborted, long-running nodes should stop between iterations. */
	signal?: AbortSignal;
	/** Run another workspace flow by id (workspace execution only). */
	executeSubflow?: (flowId: string, input: unknown) => Promise<unknown>;
	/** Resolved workspace→flow HTTP defaults (headers merged; timeout inherited). */
	httpDefaults?: HttpSettingsV1;
	/** In-run cookie jar shared across HTTP hops (when enabled). */
	cookieJar?: CookieJar;
};

export type NodeExecutionResult = {
	output: unknown;
	branch?: string;
	vars?: Record<string, unknown>;
	/** Template-resolved config / request the node actually used. */
	processedInput?: unknown;
};

export interface FlowNodePlugin {
	type: string;
	execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult>;
}
