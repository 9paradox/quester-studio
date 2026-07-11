import { Alert, AlertDescription } from "@/components/ui/alert.js";
import { TooltipProvider } from "@/components/ui/tooltip.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import { selectRightPanelVisible } from "@/stores/selectors.js";
import { useAppInit } from "@/stores/use-app-init.js";
import { ActivityBar } from "./ActivityBar.js";
import { AuxiliarySidebar } from "./AuxiliarySidebar.js";
import { EditorArea } from "./EditorArea.js";
import { Panel } from "./Panel.js";
import { PlaygroundSheet } from "./PlaygroundSheet.js";
import { PrimarySidebar } from "./PrimarySidebar.js";
import { ResizeGutter } from "./ResizeGutter.js";
import { StatusBar } from "./StatusBar.js";
import { TopBar } from "./TopBar.js";

export function AppShell() {
	useAppInit();

	const loadError = useQuesterStore((s) => s.loadError);
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
						<AlertDescription>{loadError}</AlertDescription>
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
							<ResizeGutter
								orientation="vertical"
								onResize={resizeRightPanel}
							/>
						) : null}
						<AuxiliarySidebar />
					</div>
					<Panel />
					<StatusBar />
				</div>
				<PlaygroundSheet />
			</div>
		</TooltipProvider>
	);
}
