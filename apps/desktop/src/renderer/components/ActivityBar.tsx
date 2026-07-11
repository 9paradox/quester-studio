import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip.js";
import type { ActivityView } from "@/lib/nodeCatalog.js";
import { cn } from "@/lib/utils.js";
import { IconBox, IconFiles, IconKey, IconStack2 } from "@tabler/icons-react";

type ActivityBarProps = {
	activeView: ActivityView;
	sidebarOpen: boolean;
	onViewChange: (view: ActivityView) => void;
};

const items: Array<{
	view: ActivityView;
	label: string;
	icon: typeof IconFiles;
}> = [
	{ view: "flows", label: "Flows", icon: IconFiles },
	{ view: "envs", label: "Environments", icon: IconStack2 },
	{ view: "secrets", label: "Secrets", icon: IconKey },
	{ view: "nodes", label: "Nodes", icon: IconBox },
];

export function ActivityBar({
	activeView,
	sidebarOpen,
	onViewChange,
}: ActivityBarProps) {
	return (
		<nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r bg-sidebar py-2">
			{items.map(({ view, label, icon: Icon }) => {
				const active = sidebarOpen && activeView === view;
				return (
					<Tooltip key={view}>
						<TooltipTrigger
							className={cn(buttonClass(active))}
							onClick={() => onViewChange(view)}
							aria-label={label}
							aria-pressed={active}
						>
							<Icon className="size-4" />
						</TooltipTrigger>
						<TooltipContent side="right">{label}</TooltipContent>
					</Tooltip>
				);
			})}
		</nav>
	);
}

function buttonClass(active: boolean): string {
	return cn(
		"inline-flex size-9 items-center justify-center rounded-md border border-transparent text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
		active && "bg-sidebar-accent text-sidebar-accent-foreground",
	);
}
