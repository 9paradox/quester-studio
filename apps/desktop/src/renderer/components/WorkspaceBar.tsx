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
		<header className="flex items-center gap-4 border-b px-4 py-2">
			<span className="text-sm font-semibold">Quester</span>
			<button
				type="button"
				onClick={onOpenWorkspace}
				disabled={isLoading}
				className="rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
			>
				Open workspace
			</button>
			<div className="min-w-0 flex-1">
				<div className="truncate text-sm font-medium">{workspaceName}</div>
				<div className="truncate text-xs text-gray-500">{workspacePath}</div>
			</div>
		</header>
	);
}
