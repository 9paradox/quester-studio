import { Button } from "@/components/ui/button.js";
import { cn } from "@/lib/utils.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import { IconPlugConnected, IconRobot } from "@tabler/icons-react";

/** Banner when MCP/agent is controlling or following the workspace. */
export function AiFollowingBanner() {
	const aiFollowing = useQuesterStore((s) => s.aiFollowing);
	const message = useQuesterStore((s) => s.aiFollowMessage);
	const pending = useQuesterStore((s) => s.pendingExternalFlow);
	const mcpRunning = useQuesterStore((s) => s.mcpServerStatus.running);
	const accept = useQuesterStore((s) => s.acceptExternalFlowChange);
	const discard = useQuesterStore((s) => s.discardExternalFlowChange);
	const setAiFollowing = useQuesterStore((s) => s.setAiFollowing);
	const stopMcpServer = useQuesterStore((s) => s.stopMcpServer);
	const openWorkspaceSettings = useQuesterStore((s) => s.openWorkspaceSettings);

	const active = aiFollowing || mcpRunning;
	if (!active) return null;

	const controlling = aiFollowing || pending;

	return (
		<output
			className={cn(
				"flex items-center gap-2 border-b px-3 py-2 text-xs",
				controlling
					? "border-amber-500/80 bg-amber-500/15 text-foreground ring-1 ring-inset ring-amber-500/40"
					: "border-emerald-500/50 bg-emerald-500/10 text-foreground",
			)}
		>
			{controlling ? (
				<IconRobot className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
			) : (
				<IconPlugConnected className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
			)}
			<span className="min-w-0 flex-1 truncate font-medium">
				{controlling
					? (message ??
						"MCP / agent is updating this workspace — canvas follows disk")
					: "MCP server running — agents may edit flows via tools"}
			</span>
			{pending ? (
				<>
					<Button size="sm" variant="default" onClick={() => accept()}>
						Accept
					</Button>
					<Button size="sm" variant="outline" onClick={() => discard()}>
						Keep draft
					</Button>
				</>
			) : (
				<>
					{mcpRunning ? (
						<Button
							size="sm"
							variant="outline"
							onClick={() => void stopMcpServer()}
						>
							Stop MCP
						</Button>
					) : null}
					{aiFollowing ? (
						<Button
							size="sm"
							variant="ghost"
							onClick={() => setAiFollowing(false)}
						>
							Dismiss
						</Button>
					) : (
						<Button
							size="sm"
							variant="ghost"
							onClick={() => void openWorkspaceSettings("mcp")}
						>
							Settings
						</Button>
					)}
				</>
			)}
		</output>
	);
}
