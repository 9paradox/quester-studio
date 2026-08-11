export type ResolverContext = {
	env: Record<string, unknown>;
	secrets: Record<string, unknown>;
	input: unknown;
	vars: Record<string, unknown>;
	nodeOutputs: Record<string, unknown>;
	/** Foreach body scopes: item (or itemVar) + index. */
	loop?: Record<string, unknown>;
	/** Form node bindings (`{{form.*}}`) while resolving a form. */
	form?: Record<string, unknown>;
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
	if (ctx.loop && Object.hasOwn(ctx.loop, scope)) {
		return getPath(ctx.loop[scope], path);
	}
	switch (scope) {
		case "env":
			return getPath(ctx.env, path);
		case "secrets":
			return getPath(ctx.secrets, path);
		case "input":
			return getPath(ctx.input, path);
		case "vars":
			return getPath(ctx.vars, path);
		case "form":
			return getPath(ctx.form ?? {}, path);
		case "index":
			return ctx.loop?.index;
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

function resolveToken(trimmed: string, ctx: ResolverContext): unknown {
	const dot = trimmed.indexOf(".");
	if (dot === -1) {
		return resolvePath(ctx, trimmed, "");
	}
	const scope = trimmed.slice(0, dot);
	const path = trimmed.slice(dot + 1);
	return resolvePath(ctx, scope, path);
}

function stringifyResolved(v: unknown): string {
	if (v === undefined || v === null) return "";
	if (typeof v === "string") return v;
	if (typeof v === "number" || typeof v === "boolean") return String(v);
	try {
		return JSON.stringify(v);
	} catch {
		return String(v);
	}
}

/**
 * Resolve a template that is exactly one `{{path}}` token to the raw value
 * (arrays/objects preserved). Otherwise returns the stringified template result.
 */
export function resolveTemplateValue(
	template: string,
	ctx: ResolverContext,
): unknown {
	const trimmed = template.trim();
	const single = /^\{\{\s*([^}]+?)\s*\}\}$/.exec(trimmed);
	if (single?.[1]) {
		return resolveToken(single[1].trim(), ctx);
	}
	return resolveTemplate(template, ctx);
}

export function resolveTemplate(
	template: string,
	ctx: ResolverContext,
): string {
	return template.replace(TOKEN_RE, (_match, inner: string) => {
		const v = resolveToken(inner.trim(), ctx);
		return stringifyResolved(v);
	});
}
