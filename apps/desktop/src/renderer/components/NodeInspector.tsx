import {
	AssertChecksEditor,
	normalizeAssertChecks,
} from "@/components/AssertChecksEditor.js";
import { CodeEditor } from "@/components/CodeEditor.js";
import { HeadersEditor } from "@/components/HeadersEditor.js";
import { JmesPathField } from "@/components/JmesPathField.js";
import { JsonDraftField } from "@/components/JsonDraftField.js";
import { NodeHelpDialog } from "@/components/NodeHelpDialog.js";
import { TemplateField } from "@/components/TemplateField.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select.js";
import { Separator } from "@/components/ui/separator.js";
import { Textarea } from "@/components/ui/textarea.js";
import {
	HTTP_BODY_TYPE_OPTIONS,
	type HttpBodyType,
	bodyTypeOption,
	headersForBodyType,
	inferBodyType,
} from "@/lib/httpBodyType.js";
import { getNodePresentation } from "@/lib/nodeCatalog.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import {
	type BuiltinNodeType,
	type FlowNodeV1,
	builtinNodeTypes,
} from "@quester-studio/schema";
import type { ReactNode } from "react";

type NodeInspectorProps = {
	node: FlowNodeV1;
	onUpdate: (data: Record<string, unknown>) => void;
};

const HTTP_METHODS = [
	"GET",
	"POST",
	"PUT",
	"PATCH",
	"DELETE",
	"HEAD",
	"OPTIONS",
] as const;

function isBuiltinType(type: string): type is BuiltinNodeType {
	return (builtinNodeTypes as readonly string[]).includes(type);
}

function parseRunInputJson(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return {};
	}
}

export function NodeInspector({ node, onUpdate }: NodeInspectorProps) {
	const data = node.data as Record<string, unknown>;
	const inputJson = useQuesterStore((s) => s.inputJson);
	const setInputJson = useQuesterStore((s) => s.setInputJson);

	const setField = (key: string, value: unknown) => {
		onUpdate({ ...data, [key]: value });
	};

	const headers =
		data.headers &&
		typeof data.headers === "object" &&
		!Array.isArray(data.headers)
			? (data.headers as Record<string, string>)
			: {};

	const contentTypeHeader = Object.entries(headers).find(
		([k]) => k.toLowerCase() === "content-type",
	)?.[1];
	const bodyType = inferBodyType(contentTypeHeader);
	const bodyOption = bodyTypeOption(bodyType);

	const presentation = isBuiltinType(node.type)
		? getNodePresentation(node.type)
		: null;
	const Icon = presentation?.icon;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-start gap-2">
				{Icon ? (
					<span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
						<Icon className="size-4" />
					</span>
				) : null}
				<div className="min-w-0 flex-1">
					<div className="text-sm font-medium">
						{presentation?.label ?? node.type}
					</div>
					{presentation ? (
						<p className="text-[11px] leading-relaxed text-muted-foreground">
							{presentation.description}
						</p>
					) : null}
					<div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
						{node.id}
					</div>
				</div>
				{isBuiltinType(node.type) ? <NodeHelpDialog type={node.type} /> : null}
			</div>

			<InspectorField label="Label">
				<Input
					value={String(data.label ?? "")}
					onChange={(e) => setField("label", e.target.value)}
				/>
			</InspectorField>

			{node.type === "input" ? (
				<>
					<Separator />
					<InspectorField
						label="Run input (JSON)"
						hint={
							<>
								Saved on this input node as{" "}
								<code className="font-mono text-[10px]">data.value</code> and
								passed when you click Run. Reference fields as{" "}
								<code className="font-mono text-[10px]">{"{{input.*}}"}</code>{" "}
								in later nodes.
							</>
						}
					>
						<JsonDraftField
							id="flow-run-input"
							key={`${node.id}-run-input`}
							value={parseRunInputJson(inputJson)}
							onCommit={(next) => {
								setInputJson(JSON.stringify(next, null, 2));
								useQuesterStore.setState({ inputError: null });
							}}
							minHeight="12rem"
							placeholder={'{\n  "key": "value"\n}'}
						/>
					</InspectorField>
				</>
			) : null}

			{node.type === "http" ? (
				<>
					<InspectorField label="Method">
						<Select
							value={String(data.method ?? "GET")}
							onValueChange={(v) => v && setField("method", v)}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{HTTP_METHODS.map((m) => (
									<SelectItem key={m} value={m}>
										{m}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</InspectorField>
					<InspectorField
						label="URL"
						hint={
							<>
								Supports templates like{" "}
								<code className="font-mono text-[10px]">
									{"{{env.API_BASE}}/path"}
								</code>
							</>
						}
					>
						<TemplateField
							value={String(data.url ?? "")}
							onChange={(url) => setField("url", url)}
							placeholder="{{env.API_BASE}}/path"
						/>
					</InspectorField>
					<InspectorField label="Headers">
						<HeadersEditor
							key={node.id}
							headers={headers}
							onChange={(next) => setField("headers", next)}
						/>
					</InspectorField>
					<InspectorField
						label="Body"
						hint="String body with templates. Omitted for GET/HEAD at send time."
						action={
							<Select
								value={bodyType}
								onValueChange={(v) => {
									if (!v) return;
									onUpdate({
										...data,
										headers: headersForBodyType(headers, v as HttpBodyType),
									});
								}}
							>
								<SelectTrigger
									size="sm"
									className="h-6 w-[5.5rem] text-[11px]"
									aria-label="Body content type"
								>
									<SelectValue>{bodyOption.label}</SelectValue>
								</SelectTrigger>
								<SelectContent align="end">
									{HTTP_BODY_TYPE_OPTIONS.map((opt) => (
										<SelectItem key={opt.id} value={opt.id}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						}
					>
						<CodeEditor
							value={
								typeof data.body === "string"
									? data.body
									: data.body === undefined
										? ""
										: JSON.stringify(data.body, null, 2)
							}
							onChange={(body) => setField("body", body)}
							language={bodyType}
							lint={false}
							formatOnBlur={bodyType === "json"}
							minHeight="10rem"
							placeholder={bodyOption.placeholder}
						/>
					</InspectorField>
				</>
			) : null}

			{node.type === "template" ? (
				<InspectorField
					label="Template"
					hint={
						<>
							Use <code className="font-mono text-[10px]">{"{{input.*}}"}</code>
							, <code className="font-mono text-[10px]">{"{{nodes.id}}"}</code>,{" "}
							<code className="font-mono text-[10px]">{"{{env.*}}"}</code>, or
							Eta <code className="font-mono text-[10px]">{"<%= it.* %>"}</code>
						</>
					}
				>
					<TemplateField
						value={String(data.template ?? "")}
						onChange={(template) => setField("template", template)}
						multiline
						rows={8}
						completionMode="template+eta"
					/>
				</InspectorField>
			) : null}

			{node.type === "if" ? (
				<>
					<InspectorField
						label="Condition"
						hint='Optional templated truthy string. Combined with checks using AND when both are set. Truthy unless "", "0", or "false".'
					>
						<TemplateField
							value={String(data.condition ?? "")}
							onChange={(condition) => {
								const hasChecks =
									Array.isArray(data.checks) && data.checks.length > 0;
								if (condition === "") {
									onUpdate({
										...data,
										condition: hasChecks ? undefined : "true",
									});
									return;
								}
								setField("condition", condition);
							}}
							placeholder="{{input.active}}"
						/>
					</InspectorField>
					<InspectorField
						label="Checks"
						hint="Optional JMESPath checks on the previous output (same operators as assert). All must pass."
					>
						<AssertChecksEditor
							checks={data.checks}
							minChecks={0}
							onChange={(checks) => {
								onUpdate({
									...data,
									checks: checks.length > 0 ? checks : undefined,
									condition:
										checks.length === 0 &&
										(data.condition === undefined || data.condition === "")
											? "true"
											: data.condition,
								});
							}}
						/>
					</InspectorField>
				</>
			) : null}

			{node.type === "delay" ? (
				<>
					<InspectorField
						label="Milliseconds"
						hint="Base sleep duration before the next node runs."
					>
						<Input
							type="number"
							min={0}
							value={String(data.ms ?? 0)}
							onChange={(e) =>
								setField("ms", Math.max(0, Number(e.target.value) || 0))
							}
						/>
					</InspectorField>
					<InspectorField
						label="Jitter (ms)"
						hint="Optional random extra delay from 0 up to this value."
					>
						<Input
							type="number"
							min={0}
							value={String(data.jitterMs ?? 0)}
							onChange={(e) =>
								setField("jitterMs", Math.max(0, Number(e.target.value) || 0))
							}
						/>
					</InspectorField>
				</>
			) : null}

			{node.type === "foreach" ? (
				<>
					<InspectorField
						label="Items"
						hint="JMESPath on previous output or templated JSON array string."
					>
						<JmesPathField
							value={String(data.items ?? "items")}
							onChange={(items) => setField("items", items)}
							placeholder="body.users"
						/>
					</InspectorField>
					<InspectorField
						label="Map"
						hint="Optional JMESPath on { [itemVar]: item, index } per element."
					>
						<JmesPathField
							value={String(data.map ?? "")}
							onChange={(map) => {
								if (map === "") {
									const { map: _omit, ...rest } = data;
									onUpdate(rest);
									return;
								}
								setField("map", map);
							}}
							placeholder="item.id"
						/>
					</InspectorField>
					<InspectorField label="Item variable" hint='Default "item".'>
						<Input
							value={String(data.itemVar ?? "item")}
							onChange={(e) => setField("itemVar", e.target.value)}
						/>
					</InspectorField>
					<InspectorField
						label="Max items"
						hint="Cap iteration count (default 100)."
					>
						<Input
							type="number"
							min={1}
							value={String(data.maxItems ?? 100)}
							onChange={(e) =>
								setField("maxItems", Math.max(1, Number(e.target.value) || 100))
							}
						/>
					</InspectorField>
					<InspectorField
						label="Concurrency"
						hint="Optional parallel item processing limit."
					>
						<Input
							type="number"
							min={1}
							value={
								data.concurrency === undefined ? "" : String(data.concurrency)
							}
							onChange={(e) => {
								const raw = e.target.value.trim();
								if (raw === "") {
									const { concurrency: _omit, ...rest } = data;
									onUpdate(rest);
									return;
								}
								setField("concurrency", Math.max(1, Number(raw) || 1));
							}}
							placeholder="1"
						/>
					</InspectorField>
				</>
			) : null}

			{node.type === "try" ? (
				<>
					<InspectorField
						label="Condition"
						hint="Optional templated truthy string. Combined with checks using AND when both are set."
					>
						<TemplateField
							value={String(data.condition ?? "")}
							onChange={(condition) => {
								const hasChecks =
									Array.isArray(data.checks) && data.checks.length > 0;
								if (condition === "") {
									onUpdate({
										...data,
										condition: hasChecks ? undefined : "true",
									});
									return;
								}
								setField("condition", condition);
							}}
							placeholder="{{input.active}}"
						/>
					</InspectorField>
					<InspectorField
						label="Checks"
						hint='On fail, branch "catch" instead of stopping the flow.'
					>
						<AssertChecksEditor
							checks={data.checks}
							minChecks={0}
							onChange={(checks) => {
								onUpdate({
									...data,
									checks: checks.length > 0 ? checks : undefined,
									condition:
										checks.length === 0 &&
										(data.condition === undefined || data.condition === "")
											? "true"
											: data.condition,
								});
							}}
						/>
					</InspectorField>
				</>
			) : null}

			{node.type === "subflow" ? (
				<>
					<InspectorField
						label="Flow id"
						hint="Target flow in the workspace (without .flow.json)."
					>
						<Input
							value={String(data.flowId ?? "")}
							onChange={(e) => setField("flowId", e.target.value)}
							placeholder="login-and-profile"
						/>
					</InspectorField>
					<InspectorField
						label="Input"
						hint="JSON object of templates passed as subflow run input."
					>
						<JsonDraftField
							value={data.input ?? {}}
							onCommit={(input) => setField("input", input)}
							minHeight="7rem"
						/>
					</InspectorField>
				</>
			) : null}

			{node.type === "switch" ? (
				<>
					<InspectorField
						label="Expression"
						hint="Optional templated value to match against cases. Used when set; otherwise path is used."
					>
						<TemplateField
							value={String(data.expression ?? "")}
							onChange={(expression) => {
								if (expression === "") {
									const { expression: _omit, ...rest } = data;
									onUpdate(rest);
									return;
								}
								setField("expression", expression);
							}}
							placeholder="{{input.status}}"
						/>
					</InspectorField>
					<InspectorField
						label="Path"
						hint="Optional JMESPath on previous output. Used when expression is empty."
					>
						<JmesPathField
							value={String(data.path ?? "")}
							onChange={(path) => {
								if (path === "") {
									const { path: _omit, ...rest } = data;
									onUpdate(rest);
									return;
								}
								setField("path", path);
							}}
							placeholder="status"
						/>
					</InspectorField>
					<InspectorField
						label="Cases"
						hint='JSON array of { "value": "...", "handle": "..." }. Connect outgoing edges using sourceHandle = handle.'
					>
						<JsonDraftField
							value={data.cases ?? [{ value: "ok", handle: "success" }]}
							onCommit={(cases) => setField("cases", cases)}
							minHeight="7rem"
						/>
					</InspectorField>
					<InspectorField
						label="Default handle"
						hint='Handle when no case matches. Defaults to "default".'
					>
						<Input
							value={String(data.defaultHandle ?? "default")}
							onChange={(e) => setField("defaultHandle", e.target.value)}
						/>
					</InspectorField>
				</>
			) : null}

			{node.type === "extract" ? (
				<InspectorField
					label="Expression"
					hint="JMESPath against the previous node output."
				>
					<JmesPathField
						value={String(data.expression ?? "")}
						onChange={(expression) => setField("expression", expression)}
						placeholder="body.id"
					/>
				</InspectorField>
			) : null}

			{node.type === "set" ? (
				<InspectorField
					label="Variables"
					hint="JSON object of string, number, or boolean values. Strings are templated."
				>
					<JsonDraftField
						value={data.variables ?? {}}
						onCommit={(variables) => setField("variables", variables)}
					/>
				</InspectorField>
			) : null}

			{node.type === "assert" ? (
				<InspectorField
					label="Checks"
					hint="JMESPath path + operator (eq, gte, contains, …). Legacy equals still works."
				>
					<AssertChecksEditor
						checks={normalizeAssertChecks(data.checks)}
						onChange={(checks) => setField("checks", checks)}
					/>
				</InspectorField>
			) : null}

			{node.type === "transform" ? (
				<InspectorField
					label="Map"
					hint="JSON object: key → JMESPath expression on previous output."
				>
					<JsonDraftField
						value={data.map ?? {}}
						onCommit={(map) => setField("map", map)}
						minHeight="7rem"
					/>
				</InspectorField>
			) : null}

			{node.type === "merge" ? (
				<InspectorField
					label="Sources"
					hint='JSON array of "previous", "input", "vars", or a node id.'
				>
					<JsonDraftField
						value={data.sources ?? ["previous"]}
						onCommit={(sources) => setField("sources", sources)}
						minHeight="5rem"
					/>
				</InspectorField>
			) : null}

			{node.type === "json" ? (
				<InspectorField
					label="Expression"
					hint="Optional JMESPath on previous output. Leave empty to pass through."
				>
					<JmesPathField
						value={String(data.expression ?? "")}
						onChange={(expression) => setField("expression", expression)}
						placeholder="body"
					/>
				</InspectorField>
			) : null}

			{node.type === "inspect" || node.type === "preview" ? (
				<InspectorField
					label="Expression"
					hint="Optional JMESPath on previous output. Leave empty to preview full input."
				>
					<JmesPathField
						value={String(data.expression ?? "")}
						onChange={(expression) => setField("expression", expression)}
						placeholder="body"
					/>
				</InspectorField>
			) : null}

			{node.type === "log" ? (
				<InspectorField
					label="Message"
					hint="Templated string written to the run log."
				>
					<TemplateField
						value={String(data.message ?? "")}
						onChange={(message) => setField("message", message)}
						placeholder="status={{input.status}}"
					/>
				</InspectorField>
			) : null}

			{node.type === "note" ? (
				<InspectorField
					label="Text"
					hint="Plain text shown on the canvas sticky. Notes are not executed."
				>
					<Textarea
						value={String(data.text ?? "")}
						onChange={(e) => setField("text", e.target.value)}
						placeholder="Add a note…"
						rows={8}
						className="min-h-[120px] font-sans text-sm"
					/>
				</InspectorField>
			) : null}

			{node.type === "output" ? (
				<InspectorField
					label="Map (optional)"
					hint="Key → template string. Omit for passthrough of previous output."
				>
					<JsonDraftField
						value={data.map ?? {}}
						onCommit={(map) => {
							if (
								map &&
								typeof map === "object" &&
								!Array.isArray(map) &&
								Object.keys(map as object).length === 0
							) {
								const { map: _omit, ...rest } = data;
								onUpdate(rest);
								return;
							}
							onUpdate({ ...data, map });
						}}
						minHeight="7rem"
						placeholder={'{\n  "userId": "{{nodes.userId}}"\n}'}
					/>
				</InspectorField>
			) : null}
		</div>
	);
}

function InspectorField({
	label,
	hint,
	action,
	children,
}: {
	label: string;
	hint?: ReactNode;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between gap-2">
				<Label className="text-xs text-muted-foreground">{label}</Label>
				{action}
			</div>
			{hint ? (
				<p className="text-[11px] leading-relaxed text-muted-foreground">
					{hint}
				</p>
			) : null}
			{children}
		</div>
	);
}
