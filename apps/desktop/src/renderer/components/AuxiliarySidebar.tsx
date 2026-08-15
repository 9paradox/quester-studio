import { NodeInspector } from "@/components/NodeInspector.js";
import { ResponseViewScroll } from "@/components/ResponseView.js";
import { Button } from "@/components/ui/button.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { Separator } from "@/components/ui/separator.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import {
	selectActiveFlowRun,
	selectActiveFlowTab,
	selectRightPanelVisible,
} from "@/stores/selectors.js";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useMemo } from "react";

export type { RightPanelTab } from "@/stores/quester-store.js";

function InspectorPanelBody() {
	const flowTab = useQuesterStore(selectActiveFlowTab);
	const selectedNodeId = useQuesterStore((s) => s.selectedNodeId);
	const selectedNodeIds = useQuesterStore((s) => s.selectedNodeIds);
	const handleUpdateNode = useQuesterStore((s) => s.handleUpdateNode);
	const deleteNodes = useQuesterStore((s) => s.deleteNodes);

	const flow = flowTab?.flow ?? null;
	const selectedNode = useMemo(
		() => flow?.nodes.find((n) => n.id === selectedNodeId) ?? null,
		[flow, selectedNodeId],
	);
	const multiSelectCount = selectedNodeIds.length;

	return (
		<ScrollArea className="min-h-0 flex-1">
			<div className="p-3">
				{multiSelectCount > 1 ? (
					<div className="flex flex-col gap-3">
						<p className="text-sm text-muted-foreground">
							{multiSelectCount} nodes selected. Align or distribute from the
							canvas context menu, or delete the selection.
						</p>
						<Button
							type="button"
							variant="destructive"
							size="sm"
							onClick={() => deleteNodes(selectedNodeIds)}
						>
							Delete selected
						</Button>
					</div>
				) : selectedNode ? (
					<NodeInspector
						node={selectedNode}
						onUpdate={(data: Record<string, unknown>) =>
							handleUpdateNode(selectedNode.id, data)
						}
					/>
				) : (
					<p className="text-sm text-muted-foreground">
						Select a node on the canvas to inspect its properties.
					</p>
				)}
			</div>
		</ScrollArea>
	);
}

function ResponsePanelBody() {
	const flowTab = useQuesterStore(selectActiveFlowTab);
	const selectedNodeId = useQuesterStore((s) => s.selectedNodeId);
	const pinnedToSummary = useQuesterStore((s) => s.responsePinnedToRunSummary);
	const runResult = useQuesterStore((s) => selectActiveFlowRun(s).runResult);
	const runError = useQuesterStore((s) => selectActiveFlowRun(s).runError);
	const isRunning = useQuesterStore((s) => selectActiveFlowRun(s).isRunning);
	const nodeStatuses = useQuesterStore(
		(s) => selectActiveFlowRun(s).nodeStatuses,
	);
	const nodeTimings = useQuesterStore(
		(s) => selectActiveFlowRun(s).nodeTimings,
	);
	const focusNodeOnCanvas = useQuesterStore((s) => s.focusNodeOnCanvas);

	const flow = flowTab?.flow ?? null;
	const selectedNode = useMemo(
		() => flow?.nodes.find((n) => n.id === selectedNodeId) ?? null,
		[flow, selectedNodeId],
	);

	return (
		<div className="min-h-0 flex-1 overflow-hidden">
			<ResponseViewScroll
				runResult={runResult}
				runError={runError}
				isRunning={isRunning}
				flowNodes={flow?.nodes ?? []}
				nodeStatuses={nodeStatuses}
				nodeTimings={nodeTimings}
				selectedNodeId={selectedNodeId}
				selectedNode={selectedNode}
				pinnedToSummary={pinnedToSummary}
				onFocusNode={focusNodeOnCanvas}
			/>
		</div>
	);
}

export function AuxiliarySidebar() {
	const width = useQuesterStore((s) => s.rightPanelWidth);
	const open = useQuesterStore(selectRightPanelVisible);
	const activeTab = useQuesterStore((s) => s.rightPanelTab);
	const flowTab = useQuesterStore(selectActiveFlowTab);
	const saveActiveTab = useQuesterStore((s) => s.saveActiveTab);
	const dirty = Boolean(flowTab?.dirty);

	if (!open) return null;

	return (
		<aside
			style={{ width }}
			className="nokey flex h-full min-h-0 shrink-0 flex-col border-l bg-sidebar text-sidebar-foreground"
		>
			<div className="flex h-9 shrink-0 items-center justify-between gap-2 px-3">
				<span className="text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">
					{activeTab === "inspector" ? "Inspector" : "Response"}
				</span>
				{activeTab === "inspector" ? (
					<Button
						type="button"
						variant="outline"
						size="xs"
						disabled={!dirty}
						onClick={() => void saveActiveTab()}
					>
						<IconDeviceFloppy data-icon="inline-start" />
						Save
					</Button>
				) : null}
			</div>
			<Separator className="shrink-0 bg-sidebar-border" />
			{activeTab === "inspector" ? (
				<InspectorPanelBody />
			) : (
				<ResponsePanelBody />
			)}
		</aside>
	);
}
