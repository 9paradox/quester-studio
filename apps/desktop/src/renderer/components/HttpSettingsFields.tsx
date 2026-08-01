import { HeadersEditor } from "@/components/HeadersEditor.js";
import { Input } from "@/components/ui/input.js";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select.js";
import {
	type HttpSettingsPatch,
	applyHttpSettingsPatch,
} from "@/lib/httpSettingsPatch.js";
import type { HttpSettingsV1 } from "@quester-studio/schema";
import { SettingsField } from "./SettingsPageLayout.js";

export type { HttpSettingsPatch };
export { applyHttpSettingsPatch };

type HttpSettingsFieldsProps = {
	idPrefix: string;
	http: HttpSettingsV1 | undefined;
	onPatch: (partial: HttpSettingsPatch) => void;
	/** When true, show inherit options for TLS / cookie jar. */
	allowInherit?: boolean;
	inheritHint?: string;
};

export function HttpSettingsFields({
	idPrefix,
	http,
	onPatch,
	allowInherit = false,
	inheritHint,
}: HttpSettingsFieldsProps) {
	const verifyValue =
		http?.verifyTls === undefined ? "inherit" : http.verifyTls ? "on" : "off";
	const cookieValue =
		http?.cookieJar === undefined ? "inherit" : http.cookieJar ? "on" : "off";

	return (
		<>
			{inheritHint ? (
				<p className="text-xs text-muted-foreground">{inheritHint}</p>
			) : null}
			<SettingsField
				label="Request timeout (ms)"
				htmlFor={`${idPrefix}-timeout`}
				description="Blank = inherit from outer scope. 0 = no timeout."
			>
				<Input
					id={`${idPrefix}-timeout`}
					type="number"
					min={0}
					value={http?.timeoutMs ?? ""}
					placeholder="Inherit"
					onChange={(e) => {
						const raw = e.target.value.trim();
						if (raw === "") {
							onPatch({ timeoutMs: null });
							return;
						}
						const n = Number(raw);
						onPatch({
							timeoutMs: Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0,
						});
					}}
					className="bg-background"
				/>
			</SettingsField>
			<SettingsField
				label="Max response size (bytes)"
				htmlFor={`${idPrefix}-max-bytes`}
				description="Blank = inherit. 0 = unlimited. Responses larger than this fail the HTTP node."
			>
				<Input
					id={`${idPrefix}-max-bytes`}
					type="number"
					min={0}
					value={http?.maxResponseBytes ?? ""}
					placeholder="Inherit"
					onChange={(e) => {
						const raw = e.target.value.trim();
						if (raw === "") {
							onPatch({ maxResponseBytes: null });
							return;
						}
						const n = Number(raw);
						onPatch({
							maxResponseBytes: Number.isFinite(n)
								? Math.max(0, Math.floor(n))
								: 0,
						});
					}}
					className="bg-background"
				/>
			</SettingsField>
			<SettingsField
				label="Proxy URL"
				htmlFor={`${idPrefix}-proxy`}
				description="HTTP(S) proxy for fetches. Empty clears an outer proxy. Example: http://127.0.0.1:8080"
			>
				<Input
					id={`${idPrefix}-proxy`}
					value={http?.proxyUrl ?? ""}
					onChange={(e) => onPatch({ proxyUrl: e.target.value })}
					placeholder="http://127.0.0.1:8080"
					className="bg-background"
				/>
			</SettingsField>
			<SettingsField
				label="CA file"
				htmlFor={`${idPrefix}-ca`}
				description="Workspace-relative path to a PEM CA bundle. Empty clears an outer CA."
			>
				<Input
					id={`${idPrefix}-ca`}
					value={http?.caFile ?? ""}
					onChange={(e) => onPatch({ caFile: e.target.value })}
					placeholder="certs/ca.pem"
					className="bg-background"
				/>
			</SettingsField>
			<SettingsField
				label="Verify TLS"
				htmlFor={`${idPrefix}-tls`}
				description={
					allowInherit
						? "Inherit uses workspace then App Preferences / env."
						: "When unset in settings, App Preferences and env apply."
				}
			>
				<Select
					value={
						allowInherit
							? verifyValue
							: verifyValue === "inherit"
								? "on"
								: verifyValue
					}
					onValueChange={(value) => {
						if (value === "inherit") onPatch({ verifyTls: null });
						else if (value === "on") onPatch({ verifyTls: true });
						else if (value === "off") onPatch({ verifyTls: false });
					}}
				>
					<SelectTrigger
						id={`${idPrefix}-tls`}
						className="w-full bg-background"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{allowInherit ? (
							<SelectItem value="inherit">Inherit</SelectItem>
						) : null}
						<SelectItem value="on">On</SelectItem>
						<SelectItem value="off">Off</SelectItem>
					</SelectContent>
				</Select>
			</SettingsField>
			<SettingsField
				label="Cookie jar"
				htmlFor={`${idPrefix}-cookies`}
				description="Persist cookies across hops and runs in workspace .quester/cookies.json when enabled. Default on when unset."
			>
				<Select
					value={
						allowInherit
							? cookieValue
							: cookieValue === "inherit"
								? "on"
								: cookieValue
					}
					onValueChange={(value) => {
						if (value === "inherit") onPatch({ cookieJar: null });
						else if (value === "on") onPatch({ cookieJar: true });
						else if (value === "off") onPatch({ cookieJar: false });
					}}
				>
					<SelectTrigger
						id={`${idPrefix}-cookies`}
						className="w-full bg-background"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{allowInherit ? (
							<SelectItem value="inherit">Inherit (default on)</SelectItem>
						) : null}
						<SelectItem value="on">On</SelectItem>
						<SelectItem value="off">Off</SelectItem>
					</SelectContent>
				</Select>
			</SettingsField>
			<div className="flex flex-col gap-2">
				<p className="text-xs font-medium text-foreground">Default headers</p>
				<p className="text-xs text-muted-foreground">
					Merged into every HTTP node. Node-level headers override the same
					keys.
				</p>
				<HeadersEditor
					headers={http?.defaultHeaders ?? {}}
					onChange={(defaultHeaders) => onPatch({ defaultHeaders })}
				/>
			</div>
		</>
	);
}
