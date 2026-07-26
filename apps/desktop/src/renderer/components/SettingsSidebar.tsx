/** Legacy sidebar slot — preferences now open as an editor tab. */
export function SettingsSidebar() {
	return (
		<div className="flex min-h-0 flex-1 flex-col gap-2 p-3 text-xs text-muted-foreground">
			<p className="font-medium text-foreground">Preferences</p>
			<p>
				Theme and SSL verification open in the Preferences editor tab. Use the
				gear icon in the activity bar.
			</p>
		</div>
	);
}
