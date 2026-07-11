import type { FlowNodePlugin } from "./types.js";

const registry = new Map<string, FlowNodePlugin>();

export function registerNodePlugin(plugin: FlowNodePlugin): void {
	registry.set(plugin.type, plugin);
}

export function getNodePlugin(type: string): FlowNodePlugin | undefined {
	return registry.get(type);
}

export function listNodePlugins(): FlowNodePlugin[] {
	return [...registry.values()];
}
