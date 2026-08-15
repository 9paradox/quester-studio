import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip.js";
import { railButtonClass } from "@/lib/railButton.js";
import { type RightPanelTab, useQuesterStore } from "@/stores/quester-store.js";
import { selectRightPanelVisible } from "@/stores/selectors.js";
import { IconAdjustmentsHorizontal, IconBraces } from "@tabler/icons-react";

const items: Array<{
	tab: RightPanelTab;
	label: string;
	icon: typeof IconAdjustmentsHorizontal;
}> = [
	{ tab: "inspector", label: "Inspector", icon: IconAdjustmentsHorizontal },
	{ tab: "response", label: "Response", icon: IconBraces },
];

export function AuxiliaryActivityBar() {
	const rightPanelTab = useQuesterStore((s) => s.rightPanelTab);
	const rightPanelVisible = useQuesterStore(selectRightPanelVisible);
	const handleRightPanelView = useQuesterStore((s) => s.handleRightPanelView);
	const hasFlowTab = useQuesterStore((s) =>
		Boolean(
			s.openTabs.find((t) => t.id === s.activeTabId && t.kind === "flow"),
		),
	);

	if (!hasFlowTab) return null;

	return (
		<nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-l bg-sidebar py-2">
			{items.map(({ tab, label, icon: Icon }) => {
				const active = rightPanelVisible && rightPanelTab === tab;
				return (
					<Tooltip key={tab}>
						<TooltipTrigger
							className={railButtonClass(active)}
							onClick={() => handleRightPanelView(tab)}
							aria-label={label}
							aria-pressed={active}
						>
							<Icon className="size-4" />
						</TooltipTrigger>
						<TooltipContent side="left">{label}</TooltipContent>
					</Tooltip>
				);
			})}
		</nav>
	);
}
