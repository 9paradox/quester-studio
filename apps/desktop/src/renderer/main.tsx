import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "./components/AppShell.js";
import { syncNativeChromeTheme } from "./lib/nativeChrome.js";
import { readThemePreference } from "./lib/theme.js";
import "./styles.css";

syncNativeChromeTheme(readThemePreference());

if (typeof window !== "undefined" && window.matchMedia) {
	const mq = window.matchMedia("(prefers-color-scheme: dark)");
	mq.addEventListener("change", () => {
		if (readThemePreference() === "system") {
			syncNativeChromeTheme("system");
		}
	});
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
