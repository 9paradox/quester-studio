import { focusRing } from "@/lib/focusRing.js";
import { cn } from "@/lib/utils.js";

/** Shared class for the 48px icon rails on either side of the editor. */
export function railButtonClass(active: boolean): string {
	return cn(
		"inline-flex size-9 items-center justify-center rounded-md border border-transparent text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
		focusRing,
		active && "bg-sidebar-accent text-sidebar-accent-foreground",
	);
}
