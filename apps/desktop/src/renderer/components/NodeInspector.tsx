import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select.js";
import { Textarea } from "@/components/ui/textarea.js";
import type { FlowNodeV1 } from "@quester/schema";
import type { ReactNode } from "react";

type NodeInspectorProps = {
	node: FlowNodeV1;
	onUpdate: (data: Record<string, unknown>) => void;
};

export function NodeInspector({ node, onUpdate }: NodeInspectorProps) {
	const data = node.data as Record<string, unknown>;

	const setField = (key: string, value: unknown) => {
		onUpdate({ ...data, [key]: value });
	};

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
						<Input
							value={String(data.url ?? "")}
							onChange={(e) => setField("url", e.target.value)}
							className="font-mono"
						/>
					</Field>
					<Field label="Headers (JSON)">
						<Textarea
							value={JSON.stringify(data.headers ?? {}, null, 2)}
							onChange={(e) => {
								try {
									setField("headers", JSON.parse(e.target.value));
								} catch {
									// keep typing
								}
							}}
							className="min-h-20 font-mono text-xs"
							spellCheck={false}
						/>
					</Field>
					<Field label="Body">
						<Textarea
							value={
								typeof data.body === "string"
									? data.body
									: JSON.stringify(data.body ?? "", null, 2)
							}
							onChange={(e) => setField("body", e.target.value)}
							className="min-h-24 font-mono text-xs"
							spellCheck={false}
						/>
					</Field>
				</>
			) : null}

			{node.type === "template" ? (
				<Field label="Template">
					<Textarea
						value={String(data.template ?? "")}
						onChange={(e) => setField("template", e.target.value)}
						className="min-h-24 font-mono text-xs"
						spellCheck={false}
					/>
				</Field>
			) : null}

			{node.type === "if" ? (
				<Field label="Condition">
					<Input
						value={String(data.condition ?? "")}
						onChange={(e) => setField("condition", e.target.value)}
						className="font-mono"
					/>
				</Field>
			) : null}

			{node.type === "extract" ? (
				<>
					<Field label="Expression">
						<Input
							value={String(data.expression ?? "")}
							onChange={(e) => setField("expression", e.target.value)}
							className="font-mono"
						/>
					</Field>
					<Field label="Source">
						<Select
							value={String(data.source ?? "previous")}
							onValueChange={(v) => v && setField("source", v)}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="previous">previous</SelectItem>
								<SelectItem value="input">input</SelectItem>
							</SelectContent>
						</Select>
					</Field>
				</>
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
