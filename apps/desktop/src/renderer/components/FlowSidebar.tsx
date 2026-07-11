import { Button } from "@/components/ui/button.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { Separator } from "@/components/ui/separator.js";
import { cn } from "@/lib/utils.js";
import type { FlowMeta } from "../../shared/rpc.js";

type FlowSidebarProps = {
	flows: FlowMeta[];
	selectedFlowId: string | null;
	onSelectFlow: (flowId: string) => void;
};

export function FlowSidebar({
	flows,
	selectedFlowId,
	onSelectFlow,
}: FlowSidebarProps) {
	return (
		<aside className="flex w-52 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
			<div className="px-3 py-2 text-xs font-medium text-sidebar-foreground/70">
				Flows
			</div>
			<Separator className="bg-sidebar-border" />
			<ScrollArea className="flex-1">
				<ul className="flex flex-col gap-0.5 p-2">
					{flows.length === 0 ? (
						<li className="px-2 py-1.5 text-sm text-muted-foreground">
							No flows found
						</li>
					) : (
						flows.map((flow) => (
							<li key={flow.id}>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => onSelectFlow(flow.id)}
									className={cn(
										"w-full justify-start font-normal",
										selectedFlowId === flow.id &&
											"bg-sidebar-accent text-sidebar-accent-foreground",
									)}
								>
									{flow.name}
								</Button>
							</li>
						))
					)}
				</ul>
			</ScrollArea>
		</aside>
	);
}
