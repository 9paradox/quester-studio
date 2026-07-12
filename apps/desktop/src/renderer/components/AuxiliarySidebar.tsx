import { NodeInspector } from "@/components/NodeInspector.js";
import { ResponseViewScroll } from "@/components/ResponseView.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { Separator } from "@/components/ui/separator.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import {
	selectActiveFlowTab,
	selectRightPanelVisible,
} from "@/stores/selectors.js";

export type { RightPanelTab } from "@/stores/quester-store.js";

export function AuxiliarySidebar() {
	const width = useQuesterStore((s) => s.rightPanelWidth);
	const open = useQuesterStore(selectRightPanelVisible);
	const activeTab = useQuesterStore((s) => s.rightPanelTab);
	const flowTab = useQuesterStore(selectActiveFlowTab);
	const selectedNodeId = useQuesterStore((s) => s.selectedNodeId);
	const runResult = useQuesterStore((s) => s.runResult);
	const runError = useQuesterStore((s) => s.runError);
	const handleUpdateNode = useQuesterStore((s) => s.handleUpdateNode);

	if (!open) return null;

	const flow = flowTab?.flow ?? null;
	const selectedNode = flow?.nodes.find((n) => n.id === selectedNodeId) ?? null;

	return (
		<aside
			style={{ width }}
			className="flex h-full min-h-0 shrink-0 flex-col border-l bg-sidebar text-sidebar-foreground"
		>
			<div className="shrink-0 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">
				{activeTab === "inspector" ? "Inspector" : "Response"}
			</div>
			<Separator className="shrink-0 bg-sidebar-border" />
			{activeTab === "inspector" ? (
				<ScrollArea className="min-h-0 flex-1">
					<div className="p-3">
						{selectedNode ? (
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
			) : (
				<div className="min-h-0 flex-1 overflow-hidden">
					<ResponseViewScroll
						runResult={runResult}
						runError={runError}
						selectedNodeId={selectedNodeId}
						selectedNode={selectedNode}
					/>
				</div>
			)}
		</aside>
	);
}
