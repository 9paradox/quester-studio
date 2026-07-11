import { describe, expect, test } from "bun:test";
import { getNodePlugin, listNodePlugins } from "./registry.js";
import "./index.js";

describe("node registry", () => {
  test("registers built-in plugins", () => {
    expect(getNodePlugin("http")).toBeDefined();
    expect(listNodePlugins().length).toBeGreaterThanOrEqual(7);
  });
});