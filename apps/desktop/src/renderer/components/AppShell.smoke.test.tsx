import { afterEach, describe, expect, mock, test } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockDesktopRpc } from "../../test/mockElectrobun.js";

mockDesktopRpc();

mock.module(
	new URL("./FlowCanvas.tsx", import.meta.url).href.replace(/\\/g, "/"),
	() => ({
		FlowCanvas: () => <div data-testid="flow-canvas-stub">Flow canvas</div>,
	}),
);

const { AppShell } = await import("./AppShell.js");
const { useQuesterStore } = await import("@/stores/quester-store.js");

async function mountReadyShell() {
	const view = render(<AppShell />);
	await waitFor(() => {
		expect(useQuesterStore.getState().isLoading).toBe(false);
		expect(useQuesterStore.getState().workspaceName).toBe("Smoke Workspace");
	});
	return view;
}

describe("renderer smoke", () => {
	afterEach(() => {
		useQuesterStore.setState({
			openTabs: [],
			activeTabId: null,
			selectedNodeId: null,
			loadError: null,
			isLoading: false,
			runResult: null,
			runError: null,
			isRunning: false,
		});
	});

	test("mounts AppShell and opens flow UI without crashing", async () => {
		await mountReadyShell();

		expect(screen.getByLabelText("Flows")).toBeInTheDocument();
		expect(screen.getAllByText("Smoke Flow").length).toBeGreaterThan(0);
		expect(screen.getByTestId("flow-canvas-stub")).toBeInTheDocument();
		expect(screen.getByText("Environment")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /^run$/i })).toBeInTheDocument();
		expect(screen.getByText(/2 nodes · 1 edges/)).toBeInTheDocument();
	});

	test("opens Preferences from the activity bar", async () => {
		const user = userEvent.setup();
		await mountReadyShell();

		await user.click(screen.getByLabelText("Preferences"));

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: "Preferences" }),
			).toBeInTheDocument();
		});
		expect(
			screen.getByRole("button", { name: "Appearance" }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Network" })).toBeInTheDocument();
		expect(screen.getByText("Theme")).toBeInTheDocument();
	});

	test("opens Workspace settings HTTP fields", async () => {
		const user = userEvent.setup();
		await mountReadyShell();

		await useQuesterStore.getState().openWorkspaceSettings();

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: "Workspace settings" }),
			).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "HTTP" }));

		await waitFor(() => {
			expect(screen.getByText("Request timeout (ms)")).toBeInTheDocument();
		});
	});

	test("shows empty editor prompt when no tab is active", async () => {
		await mountReadyShell();

		useQuesterStore.setState({
			openTabs: [],
			activeTabId: null,
			selectedNodeId: null,
		});

		await waitFor(() => {
			expect(
				screen.getByText("Select a file from the sidebar"),
			).toBeInTheDocument();
		});
	});
});
