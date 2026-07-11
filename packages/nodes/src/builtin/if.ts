import { ifNodeDataSchema } from "@quester/schema";
import type { FlowNodePlugin } from "../types.js";

function evalCondition(expr: string, ctx: import("../types.js").NodeExecutionContext): boolean {
  const resolved = ctx.resolveTemplate(expr);
  if (resolved === "true") return true;
  if (resolved === "false") return false;
  return Boolean(resolved && resolved !== "0" && resolved !== "");
}

export const ifPlugin: FlowNodePlugin = {
  type: "if",
  async execute(ctx) {
    const data = ifNodeDataSchema.parse(ctx.node.data);
    const ok = evalCondition(data.condition, ctx);
    return { output: { condition: ok }, branch: ok ? "true" : "false" };
  },
};
