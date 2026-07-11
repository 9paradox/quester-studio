import {
	extractPlugin,
	httpPlugin,
	ifPlugin,
	inputPlugin,
	outputPlugin,
	setPlugin,
	templatePlugin,
} from "./builtin/index.js";
import { registerNodePlugin } from "./registry.js";

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
