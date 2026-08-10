/**
 * Structure-only views of JSON for AI agents — never include string/number leaf values.
 */

export type JsonShape =
	| { type: "null" }
	| { type: "boolean" }
	| { type: "number" }
	| { type: "string" }
	| { type: "array"; items: JsonShape; lengthHint?: number }
	| { type: "object"; properties: Record<string, JsonShape> }
	| { type: "unknown" };

const SENSITIVE_KEY =
	/^(authorization|cookie|set-cookie|password|passwd|secret|token|api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?key|client[_-]?secret)$/i;

export function isSensitiveKey(key: string): boolean {
	return SENSITIVE_KEY.test(key);
}

/** Infer a value-free structural shape (for MCP / AI context). */
export function inferJsonShape(value: unknown, depth = 0): JsonShape {
	if (depth > 12) return { type: "unknown" };
	if (value === null) return { type: "null" };
	if (typeof value === "boolean") return { type: "boolean" };
	if (typeof value === "number") return { type: "number" };
	if (typeof value === "string") return { type: "string" };
	if (Array.isArray(value)) {
		if (value.length === 0)
			return { type: "array", items: { type: "unknown" }, lengthHint: 0 };
		// Merge shapes of up to first 5 items
		const sample = value
			.slice(0, 5)
			.map((item) => inferJsonShape(item, depth + 1));
		return {
			type: "array",
			items: mergeShapes(sample),
			lengthHint: value.length,
		};
	}
	if (typeof value === "object") {
		const properties: Record<string, JsonShape> = {};
		for (const [key, child] of Object.entries(
			value as Record<string, unknown>,
		)) {
			if (isSensitiveKey(key)) {
				properties[key] = { type: "string" }; // type only — never value
				continue;
			}
			properties[key] = inferJsonShape(child, depth + 1);
		}
		return { type: "object", properties };
	}
	return { type: "unknown" };
}

function mergeShapes(shapes: JsonShape[]): JsonShape {
	if (shapes.length === 0) return { type: "unknown" };
	const first = shapes[0];
	if (!first) return { type: "unknown" };
	if (shapes.every((s) => s.type === first.type)) {
		if (first.type === "object") {
			const keys = new Set<string>();
			for (const s of shapes) {
				if (s.type === "object")
					for (const k of Object.keys(s.properties)) keys.add(k);
			}
			const properties: Record<string, JsonShape> = {};
			for (const key of keys) {
				const childShapes = shapes
					.filter(
						(s): s is Extract<JsonShape, { type: "object" }> =>
							s.type === "object",
					)
					.map((s) => s.properties[key])
					.filter((x): x is JsonShape => x !== undefined);
				properties[key] = mergeShapes(childShapes);
			}
			return { type: "object", properties };
		}
		if (first.type === "array") {
			const items = shapes
				.filter(
					(s): s is Extract<JsonShape, { type: "array" }> => s.type === "array",
				)
				.map((s) => s.items);
			return { type: "array", items: mergeShapes(items) };
		}
		return first;
	}
	return { type: "unknown" };
}

/** Convert a shape to a TypeScript type alias string. */
export function shapeToTypeScript(shape: JsonShape, name = "Root"): string {
	return `type ${name} = ${shapeToTs(shape, 0)};\n`;
}

function shapeToTs(shape: JsonShape, indent: number): string {
	const pad = "  ".repeat(indent);
	const padIn = "  ".repeat(indent + 1);
	switch (shape.type) {
		case "null":
			return "null";
		case "boolean":
			return "boolean";
		case "number":
			return "number";
		case "string":
			return "string";
		case "unknown":
			return "unknown";
		case "array":
			return `Array<${shapeToTs(shape.items, indent)}>`;
		case "object": {
			const keys = Object.keys(shape.properties);
			if (keys.length === 0) return "Record<string, unknown>";
			const lines = keys.map((key) => {
				const safe = /^[A-Za-z_][A-Za-z0-9_]*$/.test(key)
					? key
					: JSON.stringify(key);
				const child = shape.properties[key] ?? { type: "unknown" as const };
				return `${padIn}${safe}: ${shapeToTs(child, indent + 1)};`;
			});
			return `{\n${lines.join("\n")}\n${pad}}`;
		}
		default:
			return "unknown";
	}
}

/** JSON Schema-ish object for the shape (draft-ish, no values). */
export function shapeToJsonSchema(shape: JsonShape): Record<string, unknown> {
	switch (shape.type) {
		case "null":
			return { type: "null" };
		case "boolean":
			return { type: "boolean" };
		case "number":
			return { type: "number" };
		case "string":
			return { type: "string" };
		case "unknown":
			return {};
		case "array":
			return {
				type: "array",
				items: shapeToJsonSchema(shape.items),
				...(shape.lengthHint !== undefined
					? { xLengthHint: shape.lengthHint }
					: {}),
			};
		case "object": {
			const properties: Record<string, unknown> = {};
			for (const [k, v] of Object.entries(shape.properties)) {
				properties[k] = shapeToJsonSchema(v);
			}
			return {
				type: "object",
				properties,
				additionalProperties: false,
			};
		}
		default:
			return {};
	}
}

/**
 * Collect dotted / indexed paths for JMESPath (keys only).
 */
export function collectShapePaths(
	shape: JsonShape,
	prefix = "",
	out: string[] = [],
	depth = 0,
): string[] {
	if (depth > 10 || out.length > 500) return out;
	if (shape.type === "object") {
		for (const [key, child] of Object.entries(shape.properties)) {
			const path = prefix
				? /^[A-Za-z_][A-Za-z0-9_]*$/.test(key)
					? `${prefix}.${key}`
					: `${prefix}."${key}"`
				: /^[A-Za-z_][A-Za-z0-9_]*$/.test(key)
					? key
					: `"${key}"`;
			out.push(path);
			collectShapePaths(child, path, out, depth + 1);
		}
	} else if (shape.type === "array") {
		const path = prefix ? `${prefix}[0]` : "[0]";
		out.push(path);
		collectShapePaths(shape.items, path, out, depth + 1);
	}
	return out;
}

/**
 * Deep-clone JSON for opt-in values mode: redact secrets + sensitive keys.
 */
export function redactValues(
	value: unknown,
	secretValues: string[] = [],
): unknown {
	const secrets = secretValues.filter((s) => s.length > 0);
	const scrub = (s: string): string => {
		let out = s;
		for (const secret of secrets) {
			if (secret && out.includes(secret)) out = out.split(secret).join("***");
		}
		return out;
	};
	const walk = (v: unknown, key?: string): unknown => {
		if (key && isSensitiveKey(key)) return "***";
		if (typeof v === "string") return scrub(v);
		if (Array.isArray(v)) return v.map((item) => walk(item));
		if (v && typeof v === "object") {
			const out: Record<string, unknown> = {};
			for (const [k, child] of Object.entries(v as Record<string, unknown>)) {
				out[k] = walk(child, k);
			}
			return out;
		}
		return v;
	};
	return walk(value);
}

export function describeValueForAgent(
	value: unknown,
	options: { includeValues?: boolean; secretValues?: string[] } = {},
): {
	typescript: string;
	jsonSchema: Record<string, unknown>;
	paths: string[];
	values?: unknown;
} {
	const shape = inferJsonShape(value);
	const result: {
		typescript: string;
		jsonSchema: Record<string, unknown>;
		paths: string[];
		values?: unknown;
	} = {
		typescript: shapeToTypeScript(shape),
		jsonSchema: shapeToJsonSchema(shape),
		paths: collectShapePaths(shape),
	};
	if (options.includeValues) {
		result.values = redactValues(value, options.secretValues);
	}
	return result;
}
