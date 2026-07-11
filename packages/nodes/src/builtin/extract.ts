import jmespath from "jmespath";
import { extractNodeDataSchema } from "@quester/schema";
import type { FlowNodePlugin } from "../types.js";

export const extractPlugin: FlowNodePlugin = {
  type: "extract",
  async execute(ctx) {
    const data = extractNodeDataSchema.parse(ctx.node.data);
    const source = data.source === "input" ? ctx.flowInput : ctx.input;
    const value = jmespath.search(source, data.expression);
    return { output: value };
  },
};
