import { Label } from "@/components/ui/label.js";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select.js";
import {
	type ThemePreference,
	applyTheme,
	readThemePreference,
	writeThemePreference,
} from "@/lib/theme.js";
import { useEffect, useState } from "react";

export function SettingsSidebar() {
	const [theme, setTheme] = useState<ThemePreference>(() =>
		readThemePreference(),
	);

	useEffect(() => {
		applyTheme(theme);
		writeThemePreference(theme);
		if (theme !== "system") return;

		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => applyTheme("system");
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, [theme]);

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 p-3">
			<div className="flex flex-col gap-2">
				<Label htmlFor="theme-select">Theme</Label>
				<Select
					value={theme}
					onValueChange={(value) => {
						if (value === "light" || value === "dark" || value === "system") {
							setTheme(value);
						}
					}}
				>
					<SelectTrigger id="theme-select" className="w-full bg-background">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="light">Light</SelectItem>
						<SelectItem value="dark">Dark</SelectItem>
						<SelectItem value="system">System</SelectItem>
					</SelectContent>
				</Select>
				<p className="text-xs text-muted-foreground">
					Stored locally on this machine. System follows your OS preference.
				</p>
			</div>
		</div>
	);
}
