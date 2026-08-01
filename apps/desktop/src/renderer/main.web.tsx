/**
 * Browser-only entry: Vite SPA against @quester-studio/api (or in-memory mock).
 *
 * - Default: HttpQuesterClient → VITE_QUESTER_API_URL (http://127.0.0.1:8787)
 * - Mock: VITE_QUESTER_CLIENT=mock or `bun run --filter @quester-studio/desktop dev:web:mock`
 */
import { createHttpQuesterClient } from "@quester-studio/api-contract";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "./components/AppShell.js";
import {
	createMockQuesterClient,
	isMockClientEnabled,
} from "./lib/mock-quester-client.js";
import { setQuesterClient } from "./lib/quester-client.js";
import { applyTheme, readThemePreference } from "./lib/theme.js";
import "./styles.css";

const useMock = isMockClientEnabled();
const apiUrl =
	(import.meta.env.VITE_QUESTER_API_URL as string | undefined)?.replace(
		/\/$/,
		"",
	) || "http://127.0.0.1:8787";

setQuesterClient(
	useMock
		? createMockQuesterClient()
		: createHttpQuesterClient({ baseUrl: apiUrl }),
);
applyTheme(readThemePreference());

if (typeof console !== "undefined") {
	console.info(
		useMock
			? "[quester] web UI using in-memory mock client (no API)"
			: `[quester] web UI using HTTP API at ${apiUrl}`,
	);
}
class RootErrorBoundary extends Component<
	{ children: ReactNode },
	{ error: Error | null }
> {
	state = { error: null as Error | null };

	static getDerivedStateFromError(error: Error) {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("Renderer error:", error, info.componentStack);
	}

	render() {
		if (this.state.error) {
			return (
				<div className="flex h-screen flex-col gap-2 bg-background p-4 text-sm text-foreground">
					<h1 className="font-semibold text-destructive">
						Quester Studio UI error
					</h1>
					<pre className="overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs">
						{this.state.error.stack ?? this.state.error.message}
					</pre>
					{!useMock ? (
						<p className="text-muted-foreground text-xs">
							API: {apiUrl} — start with{" "}
							<code>bun run --filter @quester-studio/api dev</code> or use{" "}
							<code>dev:web:mock</code>
						</p>
					) : (
						<p className="text-muted-foreground text-xs">
							Running with in-memory mock client (no API).
						</p>
					)}
				</div>
			);
		}
		return this.props.children;
	}
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(
		<RootErrorBoundary>
			<AppShell />
		</RootErrorBoundary>,
	);
}
