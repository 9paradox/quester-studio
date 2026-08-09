import { JsonViewer } from "@/components/JsonViewer.js";
import { NodeResponsePanels } from "@/components/response/NodeResponsePanels.js";
import { RunStatusPanel } from "@/components/response/RunStatusPanel.js";
import { resolveSelectedStep } from "@/components/response/resolveStep.js";
import { ErrorAlert } from "@/components/response/shared.js";
import { isHttpOutput } from "@/components/response/types.js";
import { Badge } from "@/components/ui/badge.js";
import { Button } from "@/components/ui/button.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { getNodePresentation } from "@/lib/nodeCatalog.js";
import type { NodeTiming } from "@/lib/nodeRunStatus.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import {
	type BuiltinNodeType,
	type FlowNodeV1,
	builtinNodeTypes,
} from "@quester-studio/schema";
import { IconExternalLink } from "@tabler/icons-react";
import type { ExecuteFlowRpcResult, NodeRunStatus } from "../../shared/rpc.js";

type ResponseViewProps = {
	runResult: ExecuteFlowRpcResult | null;
	runError: string | null;
	isRunning: boolean;
	flowNodes: FlowNodeV1[];
	nodeStatuses: Record<string, NodeRunStatus>;
	nodeTimings: Record<string, NodeTiming>;
	selectedNodeId: string | null;
	selectedNode: FlowNodeV1 | null;
	pinnedToSummary: boolean;
	onFocusNode: (nodeId: string) => void;
};

function isBuiltinType(type: string): type is BuiltinNodeType {
	return (builtinNodeTypes as readonly string[]).includes(type);
}

export function ResponseView({
	runResult,
	runError,
	isRunning,
	flowNodes,
	nodeStatuses,
	nodeTimings,
	selectedNodeId,
	selectedNode,
	pinnedToSummary,
	onFocusNode,
}: ResponseViewProps) {
	const openResponseViewerTab = useQuesterStore((s) => s.openResponseViewerTab);

	const hasRun =
		isRunning || runResult !== null || (runError !== null && runError !== "");

	if (!hasRun) {
		return (
			<p className="text-sm text-muted-foreground">
				Run a flow, then select a node to inspect its request and response.
			</p>
		);
	}

	const showSummary =
		pinnedToSummary || !selectedNodeId || !runResult || isRunning;

	if (showSummary) {
		const errorText = runError ?? runResult?.error ?? null;
		const openFlowOutput = () => {
			if (!runResult) return;
			if (runResult.output === undefined && !errorText) return;
			openResponseViewerTab(
				{
					source: "flow",
					title: "Flow output",
					subtitle: "final",
					error: errorText,
					output: runResult.output ?? null,
				},
				`flow-output:${runResult.runDir ?? "latest"}`,
			);
		};
		return (
			<div className="flex flex-col gap-3">
				{!runResult && runError && !isRunning ? (
					<ErrorAlert title="Run failed" message={runError} />
				) : null}
				<RunStatusPanel
					flowNodes={flowNodes}
					isRunning={isRunning}
					runResult={runResult}
					runError={runError}
					nodeStatuses={nodeStatuses}
					nodeTimings={nodeTimings}
					selectedNodeId={selectedNodeId}
					onFocusNode={onFocusNode}
				/>
				{runResult && runResult.output !== undefined && !isRunning ? (
					<section className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<h3 className="text-xs font-medium text-muted-foreground">
								Flow output
							</h3>
							<Badge variant="outline">final</Badge>
							<span className="flex-1" />
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 gap-1.5 px-2 text-xs"
								onClick={openFlowOutput}
							>
								<IconExternalLink className="size-3.5" />
								Open in tab
							</Button>
						</div>
						<JsonViewer
							value={runResult.output}
							defaultExpandedDepth={2}
							enablePathCopy
						/>
					</section>
				) : null}
			</div>
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

	const openNodeResponse = () => {
		openResponseViewerTab(
			{
				source: "flow",
				title: `${selected.nodeId} response`,
				subtitle: presentation?.label ?? nodeType ?? "node",
				error: selected.error ?? (failed ? errorText : null),
				output: selected.output,
				pathCopyNodeId: selected.nodeId,
			},
			`flow:${selected.nodeId}`,
		);
	};

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
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 gap-1.5 px-2 text-xs"
					onClick={openNodeResponse}
				>
					<IconExternalLink className="size-3.5" />
					Open in tab
				</Button>
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
