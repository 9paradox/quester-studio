import { describe, expect, test } from "bun:test";
import { validateFlow } from "./validate-flow.js";

describe("validateFlow", () => {
  test("rejects duplicate node ids", () => {
    const result = validateFlow({
      id: "f1",
      version: "v1",
      nodes: [
        { id: "a", type: "input", data: {} },
        { id: "a", type: "output", data: {} },
      ],
      edges: [],
    });
    expect(result.success).toBe(false);
  });
});
