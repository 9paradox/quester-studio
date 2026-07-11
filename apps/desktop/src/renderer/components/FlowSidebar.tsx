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
		<aside className="flex w-48 shrink-0 flex-col border-r bg-gray-50">
			<div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
				Flows
			</div>
			<ul className="flex-1 overflow-y-auto p-2">
				{flows.length === 0 ? (
					<li className="px-2 py-1 text-sm text-gray-400">No flows found</li>
				) : (
					flows.map((flow) => (
						<li key={flow.id}>
							<button
								type="button"
								onClick={() => onSelectFlow(flow.id)}
								className={`w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-200 ${
									selectedFlowId === flow.id
										? "bg-blue-100 font-medium text-blue-900"
										: "text-gray-700"
								}`}
							>
								{flow.name}
							</button>
						</li>
					))
				)}
			</ul>
		</aside>
	);
}
