export type ResolverContext = {
	env: Record<string, unknown>;
	secrets: Record<string, unknown>;
	input: unknown;
	vars: Record<string, unknown>;
	nodeOutputs: Record<string, unknown>;
};

function getPath(obj: unknown, path: string): unknown {
	if (!path) return obj;
	const parts = path.split(".");
	let cur: unknown = obj;
	for (const part of parts) {
		if (cur === null || cur === undefined) return undefined;
		if (typeof cur !== "object") return undefined;
		cur = (cur as Record<string, unknown>)[part];
	}
	return cur;
}

function resolvePath(
	ctx: ResolverContext,
	scope: string,
	path: string,
): unknown {
	switch (scope) {
		case "env":
			return getPath(ctx.env, path);
		case "secrets":
			return getPath(ctx.secrets, path);
		case "input":
			return getPath(ctx.input, path);
		case "vars":
			return getPath(ctx.vars, path);
		default:
			if (scope.startsWith("nodes.")) {
				const rest = scope.slice("nodes.".length);
				const dot = rest.indexOf(".");
				if (dot === -1) return getPath(ctx.nodeOutputs[rest], path);
				const nodeId = rest.slice(0, dot);
				const sub = rest.slice(dot + 1);
				return getPath(getPath(ctx.nodeOutputs[nodeId], sub), path);
			}
			if (scope === "nodes") {
				const dot = path.indexOf(".");
				if (dot === -1) return ctx.nodeOutputs[path];
				const nodeId = path.slice(0, dot);
				return getPath(ctx.nodeOutputs[nodeId], path.slice(dot + 1));
			}
			return undefined;
	}
}

const TOKEN_RE = /\{\{([^}]+)\}\}/g;

export function resolveTemplate(
	template: string,
	ctx: ResolverContext,
): string {
	return template.replace(TOKEN_RE, (_match, inner: string) => {
		const trimmed = inner.trim();
		const dot = trimmed.indexOf(".");
		if (dot === -1) {
			const v = resolvePath(ctx, trimmed, "");
			return v === undefined || v === null ? "" : String(v);
		}
		const scope = trimmed.slice(0, dot);
		const path = trimmed.slice(dot + 1);
		const v = resolvePath(ctx, scope, path);
		return v === undefined || v === null ? "" : String(v);
	});
}
