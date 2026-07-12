import type { FlowNodePlugin } from "../types.js";

/** Graph entry — output only; emits an empty object so the single child can run. */
export const startPlugin: FlowNodePlugin = {
	type: "start",
	async execute() {
		return { output: {} };
	},
};
