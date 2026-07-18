import { JsonViewer } from "@/components/JsonViewer.js";
import { NodeResponsePanels } from "@/components/response/NodeResponsePanels.js";
import { resolveSelectedStep } from "@/components/response/resolveStep.js";
import { ErrorAlert } from "@/components/response/shared.js";
import { isHttpOutput } from "@/components/response/types.js";
import { Badge } from "@/components/ui/badge.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { getNodePresentation } from "@/lib/nodeCatalog.js";
import {
	type BuiltinNodeType,
	type FlowNodeV1,
	builtinNodeTypes,
} from "@quester/schema";
import type { ExecuteFlowRpcResult } from "../../shared/rpc.js";

type ResponseViewProps = {
	runResult: ExecuteFlowRpcResult | null;
	runError: string | null;
	selectedNodeId: string | null;
	selectedNode: FlowNodeV1 | null;
};

function isBuiltinType(type: string): type is BuiltinNodeType {
	return (builtinNodeTypes as readonly string[]).includes(type);
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
		return (
			<ErrorAlert title="Run failed" message={runError ?? "Unknown error"} />
		);
	}

	const { selected } = resolveSelectedStep(
		runResult,
		selectedNodeId,
		selectedNode,
	);
	const errorText = runError ?? runResult.error ?? null;
	const nodeType = selectedNode?.type ?? selected?.type;
	const presentation =
		nodeType && isBuiltinType(nodeType) ? getNodePresentation(nodeType) : null;
	const Icon = presentation?.icon;

	if (!selectedNodeId) {
		return (
			<div className="flex flex-col gap-3">
				{errorText ? (
					<ErrorAlert title="Run error" message={errorText} />
				) : null}
				<p className="text-sm text-muted-foreground">
					Select a node on the canvas to view its step details.
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
					<ErrorAlert title="Run error" message={errorText} />
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

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-2">
				{Icon ? (
					<span className="flex size-6 items-center justify-center rounded-md bg-muted">
						<Icon className="size-3.5" />
					</span>
				) : null}
				<span className="min-w-0 flex-1 truncate font-mono text-xs font-medium">
					{selected.nodeId}
				</span>
				<Badge variant="secondary">
					{presentation?.label ?? nodeType ?? "node"}
				</Badge>
				{failed ? (
					<Badge variant="destructive">failed</Badge>
				) : (
					<Badge variant="outline">ok</Badge>
				)}
				{nodeType === "http" && isHttpOutput(selected.output) ? (
					selected.output.status !== undefined ? (
						<Badge variant="outline">{selected.output.status}</Badge>
					) : null
				) : null}
			</div>

			<NodeResponsePanels step={selected} node={selectedNode} />
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
