import { ScrollArea } from "@/components/ui/scroll-area.js";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs.js";
import type { FlowV1 } from "@quester/schema";
import type { ExecuteFlowRpcResult } from "../../shared/rpc.js";
import { NodeInspector } from "./NodeInspector.js";
import { ResponseViewScroll } from "./ResponseView.js";

export type RightPanelTab = "inspector" | "response";

type AuxiliarySidebarProps = {
	width: number;
	open: boolean;
	activeTab: RightPanelTab;
	onTabChange: (tab: RightPanelTab) => void;
	flow: FlowV1 | null;
	selectedNodeId: string | null;
	onUpdateNode: (nodeId: string, data: Record<string, unknown>) => void;
	runResult: ExecuteFlowRpcResult | null;
	runError: string | null;
};

export function AuxiliarySidebar({
	width,
	open,
	activeTab,
	onTabChange,
	flow,
	selectedNodeId,
	onUpdateNode,
	runResult,
	runError,
}: AuxiliarySidebarProps) {
	if (!open) return null;

	const selectedNode = flow?.nodes.find((n) => n.id === selectedNodeId) ?? null;

	return (
		<aside
			style={{ width }}
			className="flex h-full min-h-0 shrink-0 flex-col border-l bg-background"
		>
			<Tabs
				value={activeTab}
				onValueChange={(v) => onTabChange(v as RightPanelTab)}
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
									onUpdate={(data) => onUpdateNode(selectedNode.id, data)}
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
					<ResponseViewScroll runResult={runResult} runError={runError} />
				</TabsContent>
			</Tabs>
		</aside>
	);
}
