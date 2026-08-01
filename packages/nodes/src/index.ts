import {
	assertPlugin,
	extractPlugin,
	httpPlugin,
	ifPlugin,
	inputPlugin,
	jsonPlugin,
	mergePlugin,
	notePlugin,
	outputPlugin,
	setPlugin,
	startPlugin,
	templatePlugin,
	transformPlugin,
} from "./builtin/index.js";
import { registerNodePlugin } from "./registry.js";

export * from "./types.js";
export * from "./registry.js";
export * from "./builtin/index.js";
export { CookieJar } from "./cookie-jar.js";

const builtins = [
	startPlugin,
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
	notePlugin,
];

for (const plugin of builtins) {
	registerNodePlugin(plugin);
}
