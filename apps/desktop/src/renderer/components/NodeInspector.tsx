import { HeadersEditor } from "@/components/HeadersEditor.js";
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
import { useQuesterStore } from "@/stores/quester-store.js";
import type { FlowNodeV1 } from "@quester/schema";
import type { ReactNode } from "react";

type NodeInspectorProps = {
	node: FlowNodeV1;
	onUpdate: (data: Record<string, unknown>) => void;
};

export function NodeInspector({ node, onUpdate }: NodeInspectorProps) {
	const data = node.data as Record<string, unknown>;
	const inputJson = useQuesterStore((s) => s.inputJson);
	const inputError = useQuesterStore((s) => s.inputError);
	const setInputJson = useQuesterStore((s) => s.setInputJson);

	const setField = (key: string, value: unknown) => {
		onUpdate({ ...data, [key]: value });
	};

	const formatRunInput = () => {
		try {
			const parsed = JSON.parse(inputJson) as unknown;
			setInputJson(JSON.stringify(parsed, null, 2));
			useQuesterStore.setState({ inputError: null });
		} catch (err) {
			useQuesterStore.setState({
				inputError: err instanceof Error ? err.message : "Invalid JSON",
			});
		}
	};

	const headers =
		data.headers &&
		typeof data.headers === "object" &&
		!Array.isArray(data.headers)
			? (data.headers as Record<string, string>)
			: {};

	return (
		<div className="flex flex-col gap-4">
			<div>
				<div className="text-sm font-medium capitalize">{node.type}</div>
				<div className="font-mono text-xs text-muted-foreground">{node.id}</div>
			</div>

			<Field label="Label">
				<Input
					value={String(data.label ?? "")}
					onChange={(e) => setField("label", e.target.value)}
				/>
			</Field>

			{node.type === "input" ? (
				<>
					<Separator />
					<div className="flex flex-col gap-1.5">
						<Label
							htmlFor="flow-run-input"
							className="text-xs text-muted-foreground"
						>
							Run input (JSON)
						</Label>
						<p className="text-[11px] leading-relaxed text-muted-foreground">
							Passed into this node when you click Run. Reference fields as{" "}
							<code className="font-mono text-[10px]">{"{{input.*}}"}</code> in
							later nodes.
						</p>
						<Textarea
							id="flow-run-input"
							value={inputJson}
							onChange={(e) => {
								setInputJson(e.target.value);
								useQuesterStore.setState({ inputError: null });
							}}
							onBlur={formatRunInput}
							className="min-h-48 rounded-md border bg-muted/20 p-2.5 font-mono text-xs leading-5"
							spellCheck={false}
							placeholder={'{\n  "username": "demo"\n}'}
						/>
						{inputError ? (
							<p className="text-xs text-destructive">{inputError}</p>
						) : null}
					</div>
				</>
			) : null}

			{node.type === "http" ? (
				<>
					<Field label="Method">
						<Select
							value={String(data.method ?? "GET")}
							onValueChange={(v) => v && setField("method", v)}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
									<SelectItem key={m} value={m}>
										{m}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					<Field label="URL">
						<TemplateField
							value={String(data.url ?? "")}
							onChange={(url) => setField("url", url)}
							placeholder="{{env.API_BASE}}/path"
						/>
					</Field>
					<div className="flex flex-col gap-1.5">
						<span className="text-xs text-muted-foreground">Headers</span>
						<HeadersEditor
							key={node.id}
							headers={headers}
							onChange={(next) => setField("headers", next)}
						/>
					</div>
					<Field label="Body">
						<TemplateField
							value={
								typeof data.body === "string"
									? data.body
									: data.body === undefined
										? ""
										: JSON.stringify(data.body, null, 2)
							}
							onChange={(body) => setField("body", body)}
							multiline
							rows={8}
							placeholder={'{\n  "username": "{{input.username}}"\n}'}
						/>
					</Field>
				</>
			) : null}

			{node.type === "template" ? (
				<Field label="Template">
					<TemplateField
						value={String(data.template ?? "")}
						onChange={(template) => setField("template", template)}
						multiline
						rows={8}
					/>
				</Field>
			) : null}

			{node.type === "if" ? (
				<Field label="Condition">
					<TemplateField
						value={String(data.condition ?? "")}
						onChange={(condition) => setField("condition", condition)}
						placeholder="{{input.active}}"
					/>
				</Field>
			) : null}

			{node.type === "extract" ? (
				<Field label="Expression (JMESPath on previous output)">
					<TemplateField
						value={String(data.expression ?? "")}
						onChange={(expression) => setField("expression", expression)}
						placeholder="body.id"
					/>
				</Field>
			) : null}

			{node.type === "set" ? (
				<Field label="Variables (JSON)">
					<Textarea
						value={JSON.stringify(data.variables ?? {}, null, 2)}
						onChange={(e) => {
							try {
								setField("variables", JSON.parse(e.target.value));
							} catch {
								// keep typing
							}
						}}
						className="min-h-24 font-mono text-xs"
						spellCheck={false}
					/>
				</Field>
			) : null}

			{node.type === "assert" ? (
				<Field label="Checks (JSON)">
					<Textarea
						value={JSON.stringify(data.checks ?? [], null, 2)}
						onChange={(e) => {
							try {
								setField("checks", JSON.parse(e.target.value));
							} catch {
								// keep typing
							}
						}}
						className="min-h-28 font-mono text-xs"
						spellCheck={false}
					/>
				</Field>
			) : null}

			{node.type === "transform" ? (
				<Field label="Map (JSON: key → JMESPath)">
					<Textarea
						value={JSON.stringify(data.map ?? {}, null, 2)}
						onChange={(e) => {
							try {
								setField("map", JSON.parse(e.target.value));
							} catch {
								// keep typing
							}
						}}
						className="min-h-28 font-mono text-xs"
						spellCheck={false}
					/>
				</Field>
			) : null}

			{node.type === "merge" ? (
				<Field label="Sources (JSON array)">
					<Textarea
						value={JSON.stringify(data.sources ?? ["previous"], null, 2)}
						onChange={(e) => {
							try {
								setField("sources", JSON.parse(e.target.value));
							} catch {
								// keep typing
							}
						}}
						className="min-h-20 font-mono text-xs"
						spellCheck={false}
					/>
				</Field>
			) : null}

			{node.type === "json" ? (
				<Field label="Expression (optional JMESPath on previous output)">
					<Input
						value={String(data.expression ?? "")}
						onChange={(e) => setField("expression", e.target.value)}
						className="font-mono text-xs"
					/>
				</Field>
			) : null}
		</div>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<Label className="text-xs text-muted-foreground">{label}</Label>
			{children}
		</div>
	);
}
