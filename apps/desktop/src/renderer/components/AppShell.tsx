import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from "@/components/ui/alert.js";
import { Button } from "@/components/ui/button.js";
import { Toaster } from "@/components/ui/sonner.js";
import { TooltipProvider } from "@/components/ui/tooltip.js";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts.js";
import { useSuppressBrowserContextMenu } from "@/hooks/use-suppress-browser-context-menu.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import { selectRightPanelVisible } from "@/stores/selectors.js";
import { useAppInit } from "@/stores/use-app-init.js";
import { ActivityBar } from "./ActivityBar.js";
import { AuxiliaryActivityBar } from "./AuxiliaryActivityBar.js";
import { AuxiliarySidebar } from "./AuxiliarySidebar.js";
import { CommandPalette } from "./CommandPalette.js";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { EditorArea } from "./EditorArea.js";
import { FormAwaitDialog } from "./FormAwaitDialog.js";
import { NamePromptDialog } from "./NamePromptDialog.js";
import { Panel } from "./Panel.js";
import { PlaygroundSheet } from "./PlaygroundSheet.js";
import { PrimarySidebar } from "./PrimarySidebar.js";
import { ResizeGutter } from "./ResizeGutter.js";
import { StatusBar } from "./StatusBar.js";
import { TopBar } from "./TopBar.js";

export function AppShell() {
	useAppInit();
	useKeyboardShortcuts();
	useSuppressBrowserContextMenu();

	const loadError = useQuesterStore((s) => s.loadError);
	const clearLoadError = useQuesterStore((s) => s.clearLoadError);
	const openWorkspacePicker = useQuesterStore((s) => s.openWorkspacePicker);
	const sidebarOpen = useQuesterStore((s) => s.sidebarOpen);
	const rightPanelVisible = useQuesterStore(selectRightPanelVisible);
	const resizeSidebar = useQuesterStore((s) => s.resizeSidebar);
	const resizeRightPanel = useQuesterStore((s) => s.resizeRightPanel);

	return (
		<TooltipProvider>
			<div className="flex h-screen w-screen flex-col overflow-hidden">
				<TopBar />
				{loadError ? (
					<Alert variant="destructive" className="rounded-none border-x-0">
						<AlertTitle>Could not open workspace</AlertTitle>
						<AlertDescription>{loadError}</AlertDescription>
						<AlertAction className="flex gap-1">
							<Button
								type="button"
								variant="ghost"
								size="xs"
								onClick={() => void openWorkspacePicker()}
							>
								Open…
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="xs"
								onClick={() => clearLoadError()}
							>
								Dismiss
							</Button>
						</AlertAction>
					</Alert>
				) : null}
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="flex min-h-0 flex-1 overflow-hidden">
						<ActivityBar />
						{sidebarOpen ? (
							<>
								<PrimarySidebar />
								<ResizeGutter orientation="vertical" onResize={resizeSidebar} />
							</>
						) : null}
						<EditorArea />
						{rightPanelVisible ? (
							<>
								<ResizeGutter
									orientation="vertical"
									onResize={resizeRightPanel}
								/>
								<AuxiliarySidebar />
							</>
						) : null}
						<AuxiliaryActivityBar />
					</div>
					<Panel />
					<StatusBar />
				</div>
				<PlaygroundSheet />
				<NamePromptDialog />
				<ConfirmDialog />
				<FormAwaitDialog />
				<CommandPalette />
				<Toaster position="top-center" richColors closeButton />
			</div>
		</TooltipProvider>
	);
}
