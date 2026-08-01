import type { FlowNodePlugin } from "./types.js";

const registry = new Map<string, FlowNodePlugin>();

/** Flow JSON aliases that share a plugin with another type. */
const pluginAliases: Record<string, string> = {
	wait: "delay",
	preview: "inspect",
};

export function registerNodePlugin(plugin: FlowNodePlugin): void {
	registry.set(plugin.type, plugin);
}

export function getNodePlugin(type: string): FlowNodePlugin | undefined {
	const resolved = pluginAliases[type] ?? type;
	return registry.get(resolved);
}

export function listNodePlugins(): FlowNodePlugin[] {
	return [...registry.values()];
}
