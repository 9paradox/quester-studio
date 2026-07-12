import {
	assertPlugin,
	extractPlugin,
	httpPlugin,
	ifPlugin,
	inputPlugin,
	jsonPlugin,
	mergePlugin,
	outputPlugin,
	setPlugin,
	templatePlugin,
	transformPlugin,
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
	assertPlugin,
	transformPlugin,
	mergePlugin,
	jsonPlugin,
];

for (const plugin of builtins) {
	registerNodePlugin(plugin);
}
