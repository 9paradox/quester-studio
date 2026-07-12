import { NodeInspector } from "@/components/NodeInspector.js";
import { ResponseViewScroll } from "@/components/ResponseView.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs.js";
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

	const setRightPanelTab = useQuesterStore((s) => s.setRightPanelTab);
	const handleUpdateNode = useQuesterStore((s) => s.handleUpdateNode);

	if (!open) return null;

	const flow = flowTab?.flow ?? null;
	const selectedNode = flow?.nodes.find((n) => n.id === selectedNodeId) ?? null;

	return (
		<aside
			style={{ width }}
			className="flex h-full min-h-0 shrink-0 flex-col border-l bg-background"
		>
			<Tabs
				value={activeTab}
				onValueChange={(v) => setRightPanelTab(v as "inspector" | "response")}
				className="flex min-h-0 flex-1 flex-col"
			>
				<TabsList
					variant="line"
					className="h-9 w-full shrink-0 justify-start rounded-none border-b bg-transparent px-2"
				>
					<TabsTrigger value="inspector" className="text-xs">
						Inspector
					</TabsTrigger>
					<TabsTrigger value="response" className="text-xs">
						Response
					</TabsTrigger>
				</TabsList>
				<TabsContent
					value="inspector"
					className="mt-0 min-h-0 flex-1 overflow-hidden"
				>
					<ScrollArea className="h-full">
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
				</TabsContent>
				<TabsContent
					value="response"
					className="mt-0 min-h-0 flex-1 overflow-hidden"
				>
					<ResponseViewScroll
						runResult={runResult}
						runError={runError}
						selectedNodeId={selectedNodeId}
						selectedNode={selectedNode}
					/>
				</TabsContent>
			</Tabs>
		</aside>
	);
}
