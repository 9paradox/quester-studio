import { describe, expect, test, mock } from "bun:test";
import { executeFlow } from "./execute.js";
import type { FlowV1 } from "@quester/schema";

const flow: FlowV1 = {
  id: "test",
  version: "v1",
  nodes: [
    { id: "in", type: "input", data: {} },
    {
      id: "http",
      type: "http",
      data: { method: "GET", url: "https://example.com/api", headers: {} },
    },
    { id: "out", type: "output", data: {} },
  ],
  edges: [
    { id: "e1", source: "in", target: "http" },
    { id: "e2", source: "http", target: "out" },
  ],
};

describe("executeFlow", () => {
  test("runs http node with mock fetch", async () => {
    const fetchMock = mock(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const result = await executeFlow(flow, {
      input: { user: "x" },
      fetch: fetchMock as unknown as typeof fetch,
    });
    expect(fetchMock).toHaveBeenCalled();
    expect(result.output).toEqual({
      status: 200,
      body: { ok: true },
      text: '{"ok":true}',
      headers: expect.any(Object),
    });
  });
});
