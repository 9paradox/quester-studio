import type { BuiltinNodeType } from "@quester-studio/schema";

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
			{
				name: "value",
				type: "object",
				description: "Default run payload persisted in the flow file",
			},
			{
				name: "schema",
				type: "object",
				description: "Optional shape hint (not enforced at execute time)",
			},
		],
		syntax: [
			"Typical chain: start → input → http → …",
			"Edit run payload in the inspector (or Playground) as JSON — saved as data.value",
			"Reference fields later as {{input.fieldName}}",
		],
		example: {
			label: "Credentials",
			value: { username: "emilys", password: "emilyspass" },
		},
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
			"Renders a string template. Default mode eta runs Eta JS in-process after {{…}} resolution. mode safe is interpolation only.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
			{
				name: "mode",
				type: '"eta" | "safe"',
				description:
					"eta (default): Eta tags allowed (in-process JS). safe: {{…}} only; Eta tags error.",
			},
			{
				name: "template",
				type: "string",
				description:
					"Template string with {{…}} placeholders (and Eta when mode is eta)",
			},
		],
		syntax: [
			"{{input}} — previous output as JSON string",
			"{{nodes.login.body.token}}",
			"{{env.API_BASE}}",
			"{{vars.retryCount}}",
			'mode "eta": <%= it.input.username %> (in-process JS — not sandboxed)',
			'mode "safe": rejects <% %> / <%= %>',
		],
		example: {
			label: "Greeting",
			mode: "safe",
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
	join: {
		summary:
			"AND/XOR barrier with N incoming edges. Waits for every live predecessor, then emits their outputs keyed by node id. Use for diamonds and reconvergence after if/switch/try; keep other nodes at one incoming edge.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
		],
		syntax: [
			"Wire multiple arms into join",
			"Output shape: { armNodeId: <output>, … }",
			"XOR unused if-arms are ignored (not waited on)",
		],
		example: {
			label: "Rejoin",
		},
		io: {
			input: "Ignored as a bag — engine builds the collect map",
			output: "Object of predecessor outputs by node id",
		},
	},
	if: {
		summary:
			"Branches the flow on a templated condition and/or JMESPath checks. Connect edges with sourceHandle true or false.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
			{
				name: "condition",
				type: "string",
				description:
					"Optional templated expression evaluated as truthy/falsey string",
			},
			{
				name: "checks",
				type: "array",
				description:
					"Optional list of { path, op, value? } on previous output (same ops as assert). AND with condition when both set.",
			},
		],
		syntax: [
			'{{input.active}} — true unless "", "0", or "false"',
			'{ "path": "status", "op": "gte", "value": 200 }',
			'Edge sourceHandle must be "true" or "false"',
		],
		example: {
			label: "2xx?",
			checks: [{ path: "status", op: "gte", value: 200 }],
		},
		io: {
			input: "Previous node output",
			output: '{ "condition": true | false }; branch "true" or "false"',
		},
	},
	switch: {
		summary:
			"Multi-branch routing on a templated expression or JMESPath value. Connect edges with sourceHandle matching each case handle or the default handle.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
			{
				name: "expression",
				type: "string",
				description: "Optional templated value stringified for case matching",
			},
			{
				name: "path",
				type: "string",
				description:
					"Optional JMESPath on previous output when expression is omitted",
			},
			{
				name: "cases",
				type: "array",
				description:
					"List of { value, handle } — first matching value selects branch handle",
			},
			{
				name: "defaultHandle",
				type: "string",
				description: 'Branch handle when no case matches (default "default")',
			},
		],
		syntax: [
			'cases: [{ "value": "200", "handle": "ok" }]',
			"Edge sourceHandle must match case handle or defaultHandle",
		],
		example: {
			label: "Status",
			path: "status",
			cases: [
				{ value: "200", handle: "ok" },
				{ value: "404", handle: "notFound" },
			],
			defaultHandle: "other",
		},
		io: {
			input: "Previous node output",
			output: '{ "matched": "<handle>" }; branch is the selected handle',
		},
	},
	delay: {
		summary:
			"Sleeps for ms (+ optional random jitter) then passes the previous output through unchanged. Flow JSON may use type wait as an alias.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
			{
				name: "ms",
				type: "number",
				description: "Base sleep duration in milliseconds (non-negative)",
			},
			{
				name: "jitterMs",
				type: "number",
				description: "Optional random extra delay from 0 to this value",
			},
		],
		example: {
			label: "Pause",
			ms: 1000,
			jitterMs: 250,
		},
		io: {
			input: "Previous node output",
			output: "Same as input (passthrough)",
		},
	},
	foreach: {
		summary:
			"Framed loop: body children run once per array item. Wire entry → body → exit. Outer handle: complete. Templates {{item}} / {{index}} (or itemVar).",
		fields: [
			{ name: "label", type: "string", description: "Optional UI label" },
			{
				name: "items",
				type: "string",
				description:
					"JMESPath on previous output or templated JSON array string",
			},
			{
				name: "itemVar",
				type: "string",
				description: 'Template scope name for each item (default "item")',
			},
			{
				name: "maxItems",
				type: "number",
				description: "Maximum items to process (default 100)",
			},
			{
				name: "concurrency",
				type: "number",
				description: "Optional parallel body iterations",
			},
		],
		syntax: [
			'Entry edge: sourceHandle "entry" from foreach to a body child',
			'Exit edge: targetHandle "exit" from a body child back to foreach',
			'Outer continue: sourceHandle "complete"',
		],
		example: {
			label: "Map ids",
			items: "body.users",
			maxItems: 50,
			concurrency: 4,
		},
		io: {
			input: "Previous node output",
			output: '{ "results": unknown[], "count", "truncated" }',
		},
	},
	try: {
		summary:
			"Framed exception boundary: body runs once; thrown errors take failed, else success. Soft branching stays on if.",
		fields: [
			{ name: "label", type: "string", description: "Optional UI label" },
		],
		syntax: [
			'Entry edge: sourceHandle "entry" from try to a body child',
			'Exit edge: targetHandle "exit" from a body child back to try',
			'Outer handles: "success" / "failed"',
		],
		example: {
			label: "Guard HTTP",
		},
		io: {
			input: "Previous node output",
			output: "body exit output on success; { failed, error, input } on failed",
		},
	},
	subflow: {
		summary:
			"Runs another workspace flow by id with optional templated input. Max depth 5; cycles are rejected.",
		fields: [
			{ name: "label", type: "string", description: "Optional UI label" },
			{
				name: "flowId",
				type: "string",
				description: "Target flow id (without .flow.json)",
			},
			{
				name: "input",
				type: "object",
				description: "Optional string map of templates → subflow run input",
			},
		],
		example: {
			label: "Call login",
			flowId: "login-and-profile",
			input: { user: "{{input.email}}" },
		},
		io: {
			input: "Previous node output (passthrough context for templates)",
			output: "Subflow output node result",
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
					"List of { path, op?, value?, equals? }. Ops: eq, neq, gt, gte, lt, lte, contains, notContains, startsWith, endsWith, matches, exists, truthy, falsy.",
			},
		],
		syntax: [
			'{ "path": "status", "op": "gte", "value": 200 }',
			'{ "path": "status", "equals": 200 } — legacy eq',
			'{ "path": "body.id" } — truthy check',
		],
		example: {
			label: "Assert OK",
			checks: [
				{ path: "status", op: "gte", value: 200 },
				{ path: "body.id", op: "exists" },
			],
		},
		io: {
			input: "Previous node output",
			output: '{ "ok": true, "failures": [] } on success; throws on failure',
		},
	},
	note: {
		summary:
			"Canvas sticky for plain-text annotations. Not connected to the graph and not executed by CLI or desktop runs.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label shown in the node header",
			},
			{
				name: "text",
				type: "string",
				description: "Sticky body shown on the canvas",
			},
			{
				name: "fontSize",
				type: "number",
				description: "Body font size in CSS pixels (10–48, default 12)",
			},
		],
		example: {
			label: "Note",
			text: "Use local env for DummyJSON credentials",
			fontSize: 14,
		},
		io: {
			input: "None (canvas-only)",
			output: "Not executed",
		},
	},
	log: {
		summary:
			"Writes a templated message to the run log and passes the previous output through (with a logged field).",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
			{
				name: "message",
				type: "string",
				description: "Template string shown in Logs",
			},
		],
		example: { label: "Trace", message: "status={{input.status}}" },
		io: {
			input: "Previous node output",
			output: "Input plus { logged: resolved message }",
		},
	},
	inspect: {
		summary:
			"Evaluates optional JMESPath on the previous output and shows pretty JSON on the canvas after a run.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
			{
				name: "expression",
				type: "string",
				description: "Optional JMESPath; omit to preview full input",
			},
		],
		example: { label: "Preview body", expression: "body" },
		io: {
			input: "Previous node output",
			output: "Evaluated value (passthrough when expression omitted)",
		},
	},
	mcp: {
		summary:
			"Calls a tool on an external MCP server named in workspace settings.mcp.servers.",
		fields: [
			{
				name: "label",
				type: "string",
				description: "Optional UI label",
			},
			{
				name: "server",
				type: "string",
				description: "Server id from settings.mcp.servers",
			},
			{
				name: "tool",
				type: "string",
				description: "Remote tool name",
			},
			{
				name: "arguments",
				type: "object | string",
				description: "Tool arguments (templates allowed in strings)",
			},
			{
				name: "timeoutMs",
				type: "number",
				description: "Optional call timeout (default 60000)",
			},
		],
		example: {
			label: "Echo",
			server: "local",
			tool: "echo",
			arguments: { text: "{{input.msg}}" },
		},
		io: {
			input: "Previous node output (not sent unless referenced in templates)",
			output: "MCP tool result payload",
		},
	},
};

export function getNodeHelp(type: BuiltinNodeType): NodeHelp {
	return nodeHelpByType[type];
}
