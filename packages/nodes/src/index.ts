import { registerNodePlugin } from "./registry.js";
import {
  inputPlugin,
  httpPlugin,
  extractPlugin,
  templatePlugin,
  setPlugin,
  ifPlugin,
  outputPlugin,
} from "./builtin/index.js";

export * from "./types.js";
export * from "./registry.js";
export * from "./builtin/index.js";

const builtins = [
  inputPlugin,
  httpPlugin,
  extractPlugin,
  templatePlugin,
  setPlugin,
  ifPlugin,
  outputPlugin,
];

for (const plugin of builtins) {
  registerNodePlugin(plugin);
}
