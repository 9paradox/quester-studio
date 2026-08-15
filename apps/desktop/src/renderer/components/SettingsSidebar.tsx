import { Button } from "@/components/ui/button.js";
import { formatKeyBinding } from "@/lib/commands.js";
import { useQuesterStore } from "@/stores/quester-store.js";

/** Fallback if the settings activity view is shown without a tab. */
export function SettingsSidebar() {
	const openAppPreferences = useQuesterStore((s) => s.openAppPreferences);

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-3 p-3 text-xs text-muted-foreground">
			<p className="font-medium text-foreground">Preferences</p>
			<p>
				Theme, TLS, and keyboard shortcuts open in the Preferences editor tab.
			</p>
			<Button type="button" size="sm" onClick={() => openAppPreferences()}>
				Open Preferences
				<span className="font-mono text-2xs text-muted-foreground">
					{formatKeyBinding("mod+comma")}
				</span>
			</Button>
		</div>
	);
}
