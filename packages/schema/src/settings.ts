import { z } from "zod";

/** Shared HTTP defaults for workspace / flow settings. */
export const httpSettingsSchemaV1 = z.object({
	/** Applied before node headers; node keys win on conflict. */
	defaultHeaders: z.record(z.string()).default({}),
	/**
	 * Request timeout in milliseconds. `0` = no timeout.
	 * Omitted = inherit from the next outer layer (or none).
	 */
	timeoutMs: z.number().int().nonnegative().optional(),
});

export const settingsSchemaV1 = z.object({
	http: httpSettingsSchemaV1.optional(),
});

export type HttpSettingsV1 = z.infer<typeof httpSettingsSchemaV1>;
export type SettingsV1 = z.infer<typeof settingsSchemaV1>;

/** Merge workspace → flow HTTP settings (flow wins on timeout; headers deep-merge with flow overriding keys). */
export function mergeHttpSettings(
	workspace?: HttpSettingsV1 | null,
	flow?: HttpSettingsV1 | null,
): HttpSettingsV1 {
	const defaultHeaders = {
		...(workspace?.defaultHeaders ?? {}),
		...(flow?.defaultHeaders ?? {}),
	};
	const timeoutMs =
		flow?.timeoutMs !== undefined
			? flow.timeoutMs
			: workspace?.timeoutMs !== undefined
				? workspace.timeoutMs
				: undefined;
	return {
		defaultHeaders,
		...(timeoutMs !== undefined ? { timeoutMs } : {}),
	};
}
