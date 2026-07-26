import { Button } from "@/components/ui/button.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import {
	IconFolderOpen,
	IconFolderPlus,
	IconPackage,
} from "@tabler/icons-react";

export function WorkspaceWelcome() {
	const isLoading = useQuesterStore((s) => s.isLoading);
	const recentWorkspacePaths = useQuesterStore((s) => s.recentWorkspacePaths);
	const openWorkspacePicker = useQuesterStore((s) => s.openWorkspacePicker);
	const createWorkspaceViaPicker = useQuesterStore(
		(s) => s.createWorkspaceViaPicker,
	);
	const openSampleWorkspace = useQuesterStore((s) => s.openSampleWorkspace);
	const openRecentWorkspace = useQuesterStore((s) => s.openRecentWorkspace);

	if (isLoading) {
		return (
			<div className="flex min-h-0 min-w-0 flex-1 items-center justify-center text-sm text-muted-foreground">
				Loading…
			</div>
		);
	}

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-6 bg-background px-6">
			<div className="max-w-md text-center">
				<h1 className="text-xl font-semibold tracking-tight">Quester</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Open a workspace folder, create a new one, or try the sample to get
					started.
				</p>
			</div>
			<div className="flex flex-wrap items-center justify-center gap-2">
				<Button type="button" onClick={() => void openWorkspacePicker()}>
					<IconFolderOpen />
					Open workspace
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() => void createWorkspaceViaPicker()}
				>
					<IconFolderPlus />
					Create workspace
				</Button>
				<Button
					type="button"
					variant="ghost"
					onClick={() => void openSampleWorkspace()}
				>
					<IconPackage />
					Open sample
				</Button>
			</div>
			{recentWorkspacePaths.length > 0 ? (
				<div className="w-full max-w-md">
					<p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Recent
					</p>
					<ul className="space-y-1">
						{recentWorkspacePaths.map((path) => (
							<li key={path}>
								<button
									type="button"
									className="w-full truncate rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
									title={path}
									onClick={() => void openRecentWorkspace(path)}
								>
									{path}
								</button>
							</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	);
}
