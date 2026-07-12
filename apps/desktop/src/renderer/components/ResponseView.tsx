import { JsonPane } from "@/components/JsonPane.js";
import { JsonViewer } from "@/components/JsonViewer.js";
import { Badge } from "@/components/ui/badge.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { Separator } from "@/components/ui/separator.js";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs.js";
import type { FlowNodeV1 } from "@quester/schema";
import type { ExecuteFlowRpcResult } from "../../shared/rpc.js";

type ResponseViewProps = {
	runResult: ExecuteFlowRpcResult | null;
	runError: string | null;
	selectedNodeId: string | null;
	selectedNode: FlowNodeV1 | null;
};

type StepView = {
	nodeId: string;
	type: string;
	input: unknown;
	output: unknown;
	error?: string;
};

type HttpRequestSnapshot = {
	method: string;
	url: string;
	headers: Record<string, string>;
	body?: string;
};

type HttpOutputShape = {
	status?: number;
	statusText?: string;
	headers?: Record<string, string>;
	body?: unknown;
	text?: string;
	request?: HttpRequestSnapshot;
	timing?: { durationMs: number; startedAt: number; endedAt: number };
	size?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHttpOutput(value: unknown): value is HttpOutputShape {
	return isRecord(value) && ("request" in value || "status" in value);
}

function resolveSelectedStep(
	runResult: ExecuteFlowRpcResult,
	selectedNodeId: string | null,
	selectedNode: FlowNodeV1 | null,
): { selected: StepView | null } {
	const steps: StepView[] =
		runResult.steps?.length > 0
			? runResult.steps
			: Object.keys(runResult.nodeOutputs ?? {}).map((nodeId) => ({
					nodeId,
					type: "node",
					input: runResult.nodeInputs?.[nodeId],
					output: runResult.nodeOutputs[nodeId],
				}));

	if (!selectedNodeId) return { selected: null };

	const fromSteps = steps.find((s) => s.nodeId === selectedNodeId);
	if (fromSteps) {
		return {
			selected: {
				...fromSteps,
				type: selectedNode?.type ?? fromSteps.type,
			},
		};
	}

	const input = runResult.nodeInputs?.[selectedNodeId];
	const output = runResult.nodeOutputs?.[selectedNodeId];
	if (input !== undefined || output !== undefined) {
		return {
			selected: {
				nodeId: selectedNodeId,
				type: selectedNode?.type ?? "node",
				input,
				output,
				error:
					runResult.failedNodeId === selectedNodeId
						? runResult.error
						: undefined,
			},
		};
	}

	return { selected: null };
}

function statusVariant(
	status: number | undefined,
): "default" | "secondary" | "destructive" | "outline" {
	if (status === undefined) return "outline";
	if (status >= 200 && status < 300) return "secondary";
	if (status >= 400) return "destructive";
	return "outline";
}

function HeadersTable({ headers }: { headers: Record<string, string> }) {
	const entries = Object.entries(headers);
	if (entries.length === 0) {
		return <p className="text-xs text-muted-foreground italic">No headers</p>;
	}
	return (
		<div className="overflow-hidden rounded-md border">
			<table className="w-full text-left text-[11px]">
				<thead className="border-b bg-muted/40 text-muted-foreground">
					<tr>
						<th className="px-2 py-1.5 font-medium">Header</th>
						<th className="px-2 py-1.5 font-medium">Value</th>
					</tr>
				</thead>
				<tbody>
					{entries.map(([key, value]) => (
						<tr key={key} className="border-b border-border/60 last:border-0">
							<td className="break-all px-2 py-1.5 align-top font-mono font-medium">
								{key}
							</td>
							<td className="break-all px-2 py-1.5 align-top font-mono text-muted-foreground">
								{value}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function MetaChip({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center gap-1.5 rounded-md border bg-muted/20 px-2 py-1">
			<span className="text-[10px] tracking-wide text-muted-foreground uppercase">
				{label}
			</span>
			<span className="font-mono text-[11px] font-medium">{value}</span>
		</div>
	);
}

function HttpRequestPanel({
	request,
	upstreamInput,
}: {
	request: HttpRequestSnapshot | undefined;
	upstreamInput: unknown;
}) {
	if (!request) {
		return (
			<div className="flex flex-col gap-2">
				<p className="text-xs text-muted-foreground">
					Upstream input (previous node)
				</p>
				<JsonPane value={upstreamInput} />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-2">
				<Badge variant="secondary">{request.method}</Badge>
				<code className="min-w-0 flex-1 break-all font-mono text-[11px]">
					{request.url}
				</code>
			</div>
			<Tabs defaultValue="headers">
				<TabsList variant="line" className="h-8 w-full justify-start">
					<TabsTrigger value="headers" className="text-xs">
						Headers
					</TabsTrigger>
					<TabsTrigger value="body" className="text-xs">
						Body
					</TabsTrigger>
					<TabsTrigger value="upstream" className="text-xs">
						Upstream
					</TabsTrigger>
				</TabsList>
				<TabsContent value="headers" className="mt-2">
					<HeadersTable headers={request.headers} />
				</TabsContent>
				<TabsContent value="body" className="mt-2">
					{request.body !== undefined ? (
						<JsonPane value={request.body} />
					) : (
						<p className="text-xs text-muted-foreground italic">No body</p>
					)}
				</TabsContent>
				<TabsContent value="upstream" className="mt-2">
					<JsonPane value={upstreamInput} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function HttpResponsePanel({
	output,
	error,
}: {
	output: unknown;
	error?: string;
}) {
	const http = isHttpOutput(output) ? output : null;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap gap-2">
				{http?.status !== undefined ? (
					<Badge variant={statusVariant(http.status)}>
						{http.status}
						{http.statusText ? ` ${http.statusText}` : ""}
					</Badge>
				) : null}
				{http?.timing ? (
					<MetaChip label="Time" value={`${http.timing.durationMs} ms`} />
				) : null}
				{http?.size !== undefined ? (
					<MetaChip
						label="Size"
						value={
							http.size < 1024
								? `${http.size} B`
								: `${(http.size / 1024).toFixed(1)} KB`
						}
					/>
				) : null}
			</div>

			{error ? <p className="text-xs text-destructive">{error}</p> : null}

			{http && http.status !== undefined ? (
				<Tabs defaultValue="body">
					<TabsList variant="line" className="h-8 w-full justify-start">
						<TabsTrigger value="body" className="text-xs">
							Body
						</TabsTrigger>
						<TabsTrigger value="headers" className="text-xs">
							Headers
						</TabsTrigger>
						<TabsTrigger value="raw" className="text-xs">
							Raw
						</TabsTrigger>
					</TabsList>
					<TabsContent value="body" className="mt-2">
						<JsonPane value={http.body} defaultExpandedDepth={4} />
					</TabsContent>
					<TabsContent value="headers" className="mt-2">
						<HeadersTable headers={http.headers ?? {}} />
					</TabsContent>
					<TabsContent value="raw" className="mt-2">
						<pre className="max-h-80 overflow-auto rounded-md border bg-muted/20 p-2.5 font-mono text-[11px] leading-5 break-all whitespace-pre-wrap">
							{http.text ?? ""}
						</pre>
					</TabsContent>
				</Tabs>
			) : !error ? (
				<JsonPane value={output} />
			) : null}
		</div>
	);
}

function GenericNodePanels({
	step,
	node,
}: {
	step: StepView;
	node: FlowNodeV1 | null;
}) {
	const config = node?.data ?? {};
	return (
		<div className="flex flex-col gap-4">
			<section className="flex flex-col gap-2">
				<h3 className="text-xs font-medium text-muted-foreground">Context</h3>
				<p className="text-[11px] text-muted-foreground">
					Node configuration and upstream value for this step.
				</p>
				<Tabs defaultValue="config">
					<TabsList variant="line" className="h-8 w-full justify-start">
						<TabsTrigger value="config" className="text-xs">
							Config
						</TabsTrigger>
						<TabsTrigger value="input" className="text-xs">
							Input
						</TabsTrigger>
					</TabsList>
					<TabsContent value="config" className="mt-2">
						<JsonPane value={config} />
					</TabsContent>
					<TabsContent value="input" className="mt-2">
						<JsonPane value={step.input} />
					</TabsContent>
				</Tabs>
			</section>
			<Separator />
			<section className="flex flex-col gap-2">
				<h3 className="text-xs font-medium text-muted-foreground">Output</h3>
				{step.error ? (
					<p className="text-xs text-destructive">{step.error}</p>
				) : null}
				<JsonPane value={step.error ? { error: step.error } : step.output} />
			</section>
		</div>
	);
}

export function ResponseView({
	runResult,
	runError,
	selectedNodeId,
	selectedNode,
}: ResponseViewProps) {
	if (!runResult && !runError) {
		return (
			<p className="text-sm text-muted-foreground">
				Run a flow, then select a node to inspect its request and response.
			</p>
		);
	}

	if (!runResult) {
		return <p className="text-sm text-destructive">{runError}</p>;
	}

	const { selected } = resolveSelectedStep(
		runResult,
		selectedNodeId,
		selectedNode,
	);
	const errorText = runError ?? runResult.error ?? null;
	const nodeType = selectedNode?.type ?? selected?.type;

	if (!selectedNodeId) {
		return (
			<div className="flex flex-col gap-3">
				{errorText ? (
					<p className="text-sm text-destructive">{errorText}</p>
				) : null}
				<p className="text-sm text-muted-foreground">
					Select a node on the canvas to view its details.
				</p>
				{runResult.output !== undefined ? (
					<section className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<h3 className="text-xs font-medium text-muted-foreground">
								Flow output
							</h3>
							<Badge variant="outline">final</Badge>
						</div>
						<JsonViewer value={runResult.output} defaultExpandedDepth={3} />
					</section>
				) : null}
			</div>
		);
	}

	if (!selected) {
		return (
			<div className="flex flex-col gap-3">
				{errorText ? (
					<p className="text-sm text-destructive">{errorText}</p>
				) : null}
				<p className="text-sm text-muted-foreground">
					No run data for{" "}
					<span className="font-mono text-foreground">{selectedNodeId}</span>{" "}
					yet. Run the flow to capture this node&apos;s details.
				</p>
			</div>
		);
	}

	const failed =
		Boolean(selected.error) || runResult.failedNodeId === selected.nodeId;
	const httpOut = isHttpOutput(selected.output) ? selected.output : null;

	return (
		<div className="flex flex-col gap-4">
			{errorText && failed ? (
				<p className="text-sm text-destructive">{errorText}</p>
			) : null}

			<div className="flex flex-wrap items-center gap-2">
				<span className="min-w-0 flex-1 truncate font-mono text-xs font-medium">
					{selected.nodeId}
				</span>
				<Badge variant="secondary">{nodeType}</Badge>
				{failed ? (
					<Badge variant="destructive">failed</Badge>
				) : (
					<Badge variant="outline">ok</Badge>
				)}
			</div>

			{nodeType === "http" ? (
				<>
					<section className="flex flex-col gap-2">
						<h3 className="text-xs font-medium text-muted-foreground">
							Request
						</h3>
						<HttpRequestPanel
							request={httpOut?.request}
							upstreamInput={selected.input}
						/>
					</section>
					<Separator />
					<section className="flex flex-col gap-2">
						<h3 className="text-xs font-medium text-muted-foreground">
							Response
						</h3>
						<HttpResponsePanel
							output={selected.output}
							error={selected.error}
						/>
					</section>
				</>
			) : (
				<GenericNodePanels step={selected} node={selectedNode} />
			)}
		</div>
	);
}

export function ResponseViewScroll(props: ResponseViewProps) {
	return (
		<ScrollArea className="h-full">
			<div className="p-3">
				<ResponseView {...props} />
			</div>
		</ScrollArea>
	);
}
