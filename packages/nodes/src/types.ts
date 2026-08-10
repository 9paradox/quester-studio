import type {
	FlowNodeV1,
	FormV1,
	HttpSettingsV1,
} from "@quester-studio/schema";
import type { CookieJar } from "./cookie-jar.js";

export type FormAwaitRequest = {
	nodeId: string;
	formId: string;
	form: FormV1;
	resolved: {
		fields: Array<{
			id: string;
			type: string;
			label?: string;
			description?: string;
			placeholder?: string;
			required: boolean;
			readonly: boolean;
			value: unknown;
			options?: Array<{ value: string | number | boolean; label: string }>;
		}>;
	};
};

export type NodeExecutionContext = {
	node: FlowNodeV1;
	input: unknown;
	flowInput: unknown;
	vars: Record<string, unknown>;
	nodeOutputs: Record<string, unknown>;
	resolveTemplate: (template: string) => string;
	/** Resolve a single-token template to a raw value (arrays/objects preserved). */
	resolveValue?: (template: string) => unknown;
	fetch: typeof fetch;
	/** When aborted, long-running nodes should stop between iterations. */
	signal?: AbortSignal;
	/** Run another workspace flow by id (workspace execution only). */
	executeSubflow?: (flowId: string, input: unknown) => Promise<unknown>;
	/** Resolved workspace→flow HTTP defaults (headers merged; timeout inherited). */
	httpDefaults?: HttpSettingsV1;
	/** In-run cookie jar shared across HTTP hops (when enabled). */
	cookieJar?: CookieJar;
	/** Load a workspace form definition by id. */
	getForm?: (formId: string) => Promise<FormV1>;
	/** Pause until the host supplies form field values (desktop UI or CLI map). */
	awaitForm?: (req: FormAwaitRequest) => Promise<unknown>;
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
