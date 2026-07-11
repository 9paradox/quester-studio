import { Button } from "@/components/ui/button.js";
import { Separator } from "@/components/ui/separator.js";
import { IconFolderOpen } from "@tabler/icons-react";

type WorkspaceBarProps = {
	workspaceName: string;
	workspacePath: string;
	onOpenWorkspace: () => void;
	isLoading?: boolean;
};

export function WorkspaceBar({
	workspaceName,
	workspacePath,
	onOpenWorkspace,
	isLoading,
}: WorkspaceBarProps) {
	return (
		<header className="flex h-12 shrink-0 items-center gap-3 border-b bg-background px-4">
			<span className="text-sm font-semibold">Quester</span>
			<Separator orientation="vertical" className="h-4" />
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={onOpenWorkspace}
				disabled={isLoading}
			>
				<IconFolderOpen />
				Open workspace
			</Button>
			<div className="min-w-0 flex-1">
				<div className="truncate text-sm font-medium">{workspaceName}</div>
				<div className="truncate text-xs text-muted-foreground">
					{workspacePath}
				</div>
			</div>
		</header>
	);
}
