import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select.js";
import { desktopRpc } from "@/lib/electrobun.js";
import { persistAndSyncTheme } from "@/lib/nativeChrome.js";
import { type ThemePreference, readThemePreference } from "@/lib/theme.js";
import {
	readTlsVerifyPreference,
	writeTlsVerifyPreference,
} from "@/lib/tlsPreference.js";
import { useEffect, useState } from "react";
import {
	SettingsField,
	SettingsPageLayout,
	SettingsSection,
} from "./SettingsPageLayout.js";

async function syncTlsVerifyToMain(verifyTls: boolean): Promise<void> {
	writeTlsVerifyPreference(verifyTls);
	try {
		await desktopRpc.setAppTlsVerify(verifyTls);
	} catch {
		/* RPC unavailable in some test / preview hosts */
	}
}

const CATEGORIES = [
	{ id: "appearance", label: "Appearance" },
	{ id: "network", label: "Network" },
	{ id: "shortcuts", label: "Shortcuts" },
	{ id: "about", label: "About" },
] as const;

const SHORTCUTS = [
	{ action: "Save active tab", keys: "Ctrl/⌘ S" },
	{ action: "Run flow / Send request", keys: "Ctrl/⌘ Enter" },
	{ action: "Close active tab", keys: "Ctrl/⌘ W" },
] as const;

export function AppPreferencesEditor() {
	const [category, setCategory] = useState<string>("appearance");
	const [theme, setTheme] = useState<ThemePreference>(() =>
		readThemePreference(),
	);
	const [verifyTls, setVerifyTls] = useState(() => readTlsVerifyPreference());

	useEffect(() => {
		persistAndSyncTheme(theme);
		if (theme !== "system") return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => persistAndSyncTheme("system");
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, [theme]);

	useEffect(() => {
		void syncTlsVerifyToMain(verifyTls);
	}, [verifyTls]);

	return (
		<SettingsPageLayout
			title="Preferences"
			categories={[...CATEGORIES]}
			activeCategory={category}
			onCategoryChange={setCategory}
		>
			{category === "appearance" ? (
				<SettingsSection title="Appearance">
					<SettingsField
						label="Theme"
						htmlFor="theme-select"
						description="Stored locally on this machine (app user data). System follows your OS preference."
					>
						<Select
							value={theme}
							onValueChange={(value) => {
								if (
									value === "light" ||
									value === "dark" ||
									value === "system"
								) {
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
					</SettingsField>
				</SettingsSection>
			) : null}

			{category === "network" ? (
				<SettingsSection title="Network">
					<SettingsField
						label="SSL certificate verification"
						htmlFor="tls-verify-select"
						description="Machine-local fallback when workspace/flow settings.http.verifyTls is unset. Env QUESTR_INSECURE_TLS=1 always wins. Prefer workspace caFile for self-signed servers."
					>
						<Select
							value={verifyTls ? "on" : "off"}
							onValueChange={(value) => {
								if (value === "on" || value === "off") {
									setVerifyTls(value === "on");
								}
							}}
						>
							<SelectTrigger
								id="tls-verify-select"
								className="w-full bg-background"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="on">On</SelectItem>
								<SelectItem value="off">Off</SelectItem>
							</SelectContent>
						</Select>
					</SettingsField>
				</SettingsSection>
			) : null}

			{category === "shortcuts" ? (
				<SettingsSection title="Shortcuts">
					<p className="text-xs text-muted-foreground">
						Hardwired bindings for this app. Remapping is not available yet.
					</p>
					<div className="overflow-hidden rounded-md border border-border">
						<table className="w-full text-xs">
							<thead className="bg-muted/40 text-left text-muted-foreground">
								<tr>
									<th className="px-3 py-2 font-medium">Action</th>
									<th className="px-3 py-2 font-medium">Keys</th>
								</tr>
							</thead>
							<tbody>
								{SHORTCUTS.map((row) => (
									<tr key={row.action} className="border-t border-border">
										<td className="px-3 py-2 text-foreground">{row.action}</td>
										<td className="px-3 py-2 font-mono text-muted-foreground">
											{row.keys}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</SettingsSection>
			) : null}

			{category === "about" ? (
				<SettingsSection title="About">
					<div className="flex flex-col gap-1 text-xs text-muted-foreground">
						<p className="text-sm font-medium text-foreground">Quester</p>
						<p>Local-first visual API flows.</p>
						<p>Unsigned development builds — see SECURITY.md.</p>
					</div>
				</SettingsSection>
			) : null}
		</SettingsPageLayout>
	);
}
