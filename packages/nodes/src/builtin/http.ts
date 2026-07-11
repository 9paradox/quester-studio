import { httpNodeDataSchema } from "@quester/schema";
import type { FlowNodePlugin } from "../types.js";

export const httpPlugin: FlowNodePlugin = {
  type: "http",
  async execute(ctx) {
    const data = httpNodeDataSchema.parse(ctx.node.data);
    const url = ctx.resolveTemplate(data.url);
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
    const res = await ctx.fetch(url, {
      method: data.method,
      headers,
      body: body && data.method !== "GET" && data.method !== "HEAD" ? body : undefined,
    });
    const text = await res.text();
    let json: unknown = text;
    try {
      json = JSON.parse(text);
    } catch {
      // keep text
    }
    return {
      output: {
        status: res.status,
        headers: (() => {
        const h: Record<string, string> = {};
        res.headers.forEach((value, key) => {
          h[key] = value;
        });
        return h;
      })(),
        body: json,
        text,
      },
    };
  },
};
