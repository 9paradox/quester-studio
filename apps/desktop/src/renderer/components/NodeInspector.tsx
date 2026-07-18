import {
	AssertChecksEditor,
	normalizeAssertChecks,
} from "@/components/AssertChecksEditor.js";
import { CodeEditor } from "@/components/CodeEditor.js";
import { HeadersEditor } from "@/components/HeadersEditor.js";
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
} from "@quester/schema";
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
								Passed into this node when you click Run. Reference fields as{" "}
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
							<code className="font-mono text-[10px]">{"{{env.*}}"}</code>
						</>
					}
				>
					<TemplateField
						value={String(data.template ?? "")}
						onChange={(template) => setField("template", template)}
						multiline
						rows={8}
					/>
				</InspectorField>
			) : null}

			{node.type === "if" ? (
				<InspectorField
					label="Condition"
					hint='Truthy unless the resolved string is "", "0", or "false".'
				>
					<TemplateField
						value={String(data.condition ?? "")}
						onChange={(condition) => setField("condition", condition)}
						placeholder="{{input.active}}"
					/>
				</InspectorField>
			) : null}

			{node.type === "extract" ? (
				<InspectorField
					label="Expression"
					hint="JMESPath against the previous node output."
				>
					<TemplateField
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
					hint="With equals: deep equality. Without: path must be truthy."
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
					<TemplateField
						value={String(data.expression ?? "")}
						onChange={(expression) => setField("expression", expression)}
						placeholder="body"
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
