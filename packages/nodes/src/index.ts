import {
	apiKeyPlugin,
	assertPlugin,
	basicAuthPlugin,
	bearerPlugin,
	delayPlugin,
	extractPlugin,
	foreachPlugin,
	formPlugin,
	httpPlugin,
	ifPlugin,
	inputPlugin,
	inspectPlugin,
	joinPlugin,
	jsonPlugin,
	logPlugin,
	mergePlugin,
	notePlugin,
	outputPlugin,
	setPlugin,
	startPlugin,
	subflowPlugin,
	switchPlugin,
	templatePlugin,
	transformPlugin,
	tryPlugin,
} from "./builtin/index.js";
import { registerNodePlugin } from "./registry.js";

export * from "./types.js";
export * from "./registry.js";
export * from "./builtin/index.js";
export { CookieJar, type CookieJarSnapshot } from "./cookie-jar.js";

const builtins = [
	startPlugin,
	inputPlugin,
	formPlugin,
	httpPlugin,
	bearerPlugin,
	basicAuthPlugin,
	apiKeyPlugin,
	extractPlugin,
	templatePlugin,
	setPlugin,
	ifPlugin,
	switchPlugin,
	delayPlugin,
	foreachPlugin,
	tryPlugin,
	subflowPlugin,
	outputPlugin,
	assertPlugin,
	transformPlugin,
	mergePlugin,
	joinPlugin,
	jsonPlugin,
	notePlugin,
	logPlugin,
	inspectPlugin,
];

for (const plugin of builtins) {
	registerNodePlugin(plugin);
}
