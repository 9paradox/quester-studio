import type { BuiltinNodeType } from "@quester/schema";

export type NodeHelpField = {
	name: string;
	type: string;
	description: string;
};

export type NodeHelp = {
	summary: string;
	fields: NodeHelpField[];
	syntax?: string[];
	example: unknown;
	io?: { input: string; output: string };
};

/** Condensed in-app help for each builtin node (from docs/nodes). */
export const nodeHelpByType: Record<BuiltinNodeType, NodeHelp> = {
	start: {
		summary:
			"Flow entry point. Every flow needs exactly one Start node; execution begins here.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label shown on the canvas",
			},
		],
		example: { label: "Start" },
		io: {
			input: "None (graph entry)",
			output: "Empty object {}",
		},
	},
	input: {
		summary:
			"Puts the Run panel / CLI --input JSON on the wire for the next node. Templates can still use {{input.*}} without this node.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
		],
		syntax: [
			"Typical chain: start → input → http → …",
			"Edit run payload in the inspector (or Playground) as JSON",
			"Reference fields later as {{input.fieldName}}",
		],
		example: { label: "Credentials" },
		io: {
			input: "Previous node output (often {} from start)",
			output: "The flow run input object",
		},
	},
	output: {
		summary:
			"Marks the flow result. Without map, passes through the previous output. With map, builds a new object from templated values.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
			{
				name: "map",
				type: "object",
				description:
					"Optional key → template string. Resolved JSON strings are parsed.",
			},
		],
		syntax: [
			"{{nodes.login.body.token}}",
			"{{input.email}}",
			"{{env.API_BASE}}",
		],
		example: {
			label: "Result",
			map: {
				userId: "{{nodes.userId}}",
				email: "{{input.email}}",
			},
		},
		io: {
			input: "Previous node output",
			output: "Passthrough value, or mapped object",
		},
	},
	json: {
		summary:
			"Selects a value with optional JMESPath for display on the canvas and as the next node's input.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
			{
				name: "expression",
				type: "string",
				description:
					"Optional JMESPath on the previous output; omit to pass through",
			},
		],
		syntax: ["body.id", "status", 'headers."content-type"'],
		example: { label: "JSON", expression: "body" },
		io: {
			input: "Previous node output",
			output: "Expression result, or full previous output if omitted",
		},
	},
	http: {
		summary:
			"Sends an HTTP request. URL, headers, and body support templates. Captures status, body, headers, and timing.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
			{
				name: "method",
				type: "enum",
				description: "GET · POST · PUT · PATCH · DELETE · HEAD · OPTIONS",
			},
			{
				name: "url",
				type: "string",
				description: "Must resolve to http: or https:",
			},
			{
				name: "headers",
				type: "object",
				description: "Header name → string (templated)",
			},
			{
				name: "body",
				type: "string | object",
				description: "Request body; omitted for GET/HEAD at send time",
			},
		],
		syntax: [
			"{{env.API_BASE}}/users/{{nodes.userId}}",
			"{{nodes.login.body.token}}",
			"{{input.username}}",
			"Authorization: Bearer {{vars.token}}",
		],
		example: {
			label: "Login",
			method: "POST",
			url: "{{env.API_BASE}}/login",
			headers: { "Content-Type": "application/json" },
			body: '{\n  "user": "{{input.username}}",\n  "pass": "{{input.password}}"\n}',
		},
		io: {
			input: "Previous node output (not sent unless templated)",
			output:
				"{ status, statusText, headers, body, text, request, timing, size }",
		},
	},
	extract: {
		summary:
			"Pulls a value from the previous node output with JMESPath. The next node receives only the extracted value.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
			{
				name: "expression",
				type: "string",
				description: "JMESPath over the previous output",
			},
		],
		syntax: [
			"body.id",
			"body.user.email",
			"For run-input fields prefer {{input.*}} in templates, not extract",
		],
		example: { label: "User id", expression: "body.id" },
		io: {
			input: "Previous node output (JMESPath root)",
			output: "Expression result (any JSON type, or null)",
		},
	},
	template: {
		summary:
			"Renders a string template. The resolved string is the node output (parsed as JSON when valid).",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
			{
				name: "template",
				type: "string",
				description: "Template string with {{…}} placeholders",
			},
		],
		syntax: [
			"{{input}} — previous output as JSON string",
			"{{nodes.login.body.token}}",
			"{{env.API_BASE}}",
			"{{vars.retryCount}}",
		],
		example: {
			label: "Greeting",
			template: "Hello {{input.username}}",
		},
		io: {
			input: "Previous node output",
			output: "Rendered string, or parsed JSON if valid",
		},
	},
	set: {
		summary:
			"Writes flow variables for later {{vars.*}} references. Previous output is passed through unchanged.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
			{
				name: "variables",
				type: "object",
				description:
					"Keys to set; values may be string, number, or boolean. Strings are templated.",
			},
		],
		syntax: [
			'{"token": "{{nodes.login.body.token}}"}',
			"Later: {{vars.token}}",
		],
		example: {
			label: "Init",
			variables: {
				greeting: "Hello {{input.username}}",
				retryCount: 3,
				enabled: true,
			},
		},
		io: {
			input: "Previous node output",
			output: "Same as input (passthrough); vars updated as side effect",
		},
	},
	transform: {
		summary:
			"Builds a new object by evaluating JMESPath expressions against the previous output for each key.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
			{
				name: "map",
				type: "object",
				description: "Key → JMESPath expression on previous output",
			},
		],
		syntax: [
			'{"id": "body.id", "email": "body.email"}',
			"Each value is JMESPath, not a {{template}}",
		],
		example: {
			label: "Pick fields",
			map: { id: "body.id", email: "body.email" },
		},
		io: {
			input: "Previous node output",
			output: "Object of evaluated keys",
		},
	},
	merge: {
		summary:
			"Deep-merges objects from previous, run input, vars, or named node outputs (left to right).",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
			{
				name: "sources",
				type: "string[]",
				description: 'Source names: "previous", "input", "vars", or a node id',
			},
		],
		syntax: [
			'["previous", "vars"]',
			'["previous", "login"] — merge previous with nodes.login output',
			"Non-objects are wrapped as { [sourceName]: value }",
		],
		example: {
			label: "Combine",
			sources: ["previous", "vars"],
		},
		io: {
			input: "Previous node output (source previous)",
			output: "Merged plain object",
		},
	},
	if: {
		summary:
			"Branches the flow on a templated condition. Connect edges with sourceHandle true or false.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
			{
				name: "condition",
				type: "string",
				description: "Templated expression evaluated as truthy/falsey string",
			},
		],
		syntax: [
			'{{input.active}} — true unless "", "0", or "false"',
			'Edge sourceHandle must be "true" or "false"',
		],
		example: {
			label: "Has token?",
			condition: "{{nodes.login.body.token}}",
		},
		io: {
			input: "Previous node output",
			output: '{ "condition": true | false }; branch "true" or "false"',
		},
	},
	assert: {
		summary:
			"Fails the flow when JMESPath checks on the previous output do not pass.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
			{
				name: "checks",
				type: "array",
				description:
					"List of { path, equals? }. With equals: deep equality. Without: truthy.",
			},
		],
		syntax: [
			'{ "path": "status", "equals": 200 }',
			'{ "path": "body.id" } — truthy check',
			"Equals uses exact deep equality (JSON stringify compare)",
		],
		example: {
			label: "Assert OK",
			checks: [{ path: "status", equals: 200 }, { path: "body.id" }],
		},
		io: {
			input: "Previous node output",
			output: '{ "ok": true, "failures": [] } on success; throws on failure',
		},
	},
};

export function getNodeHelp(type: BuiltinNodeType): NodeHelp {
	return nodeHelpByType[type];
}
