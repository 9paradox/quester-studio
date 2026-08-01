import { switchNodeDataSchema } from "@quester-studio/schema";
import jmespath from "jmespath";
import type { FlowNodePlugin } from "../types.js";

function stringifySwitchValue(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return JSON.stringify(value);
}

export const switchPlugin: FlowNodePlugin = {
	type: "switch",
	async execute(ctx) {
		const data = switchNodeDataSchema.parse(ctx.node.data);
		let resolved = "";
		if (data.expression !== undefined) {
			resolved = ctx.resolveTemplate(data.expression);
		} else if (data.path !== undefined) {
			resolved = stringifySwitchValue(jmespath.search(ctx.input, data.path));
		}
		const matchedCase = data.cases.find((c) => c.value === resolved);
		const handle = matchedCase?.handle ?? data.defaultHandle ?? "default";
		return { output: { matched: handle }, branch: handle };
	},
};
