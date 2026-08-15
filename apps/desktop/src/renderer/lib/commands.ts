import { callQuesterZoom } from "@/lib/canvasZoom.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import {
	selectActiveFlowRun,
	selectActiveTab,
	selectCanRun,
} from "@/stores/selectors.js";

const DOCS_URL = "https://github.com/9paradox/quester-studio#readme";

export type CommandKeyBinding = string;

export type AppCommandGroup = "File" | "Edit" | "View" | "Canvas" | "Help";

export type AppCommand = {
	id: string;
	label: string;
	group?: AppCommandGroup;
	keywords?: string[];
	keys?: CommandKeyBinding[];
	run: () => void;
	when?: () => boolean;
};

function hasWorkspace(): boolean {
	return Boolean(useQuesterStore.getState().workspacePath);
}

let commandPaletteOpen = false;
const commandPaletteListeners = new Set<(open: boolean) => void>();

export function subscribeCommandPalette(
	listener: (open: boolean) => void,
): () => void {
	commandPaletteListeners.add(listener);
	listener(commandPaletteOpen);
	return () => {
		commandPaletteListeners.delete(listener);
	};
}

export function isCommandPaletteOpen(): boolean {
	return commandPaletteOpen;
}

export function setCommandPaletteOpen(open: boolean): void {
	if (commandPaletteOpen === open) return;
	commandPaletteOpen = open;
	for (const listener of commandPaletteListeners) {
		listener(open);
	}
}

export function buildAppCommands(): AppCommand[] {
	return [
		{
			id: "palette.show",
			label: "Show Command Palette",
			group: "View",
			keywords: ["commands", "search"],
			keys: ["mod+shift+p"],
			run: () => setCommandPaletteOpen(true),
		},
		{
			id: "flow.run",
			label: "Run Flow",
			group: "Edit",
			keywords: ["execute", "start"],
			keys: ["mod+enter"],
			when: () => {
				const state = useQuesterStore.getState();
				const activeTab = selectActiveTab(state);
				return activeTab?.kind === "flow" && selectCanRun(state);
			},
			run: () => {
				void useQuesterStore.getState().runFlow();
			},
		},
		{
			id: "request.send",
			label: "Send Request",
			group: "Edit",
			keywords: ["run", "execute"],
			keys: ["mod+enter"],
			when: () =>
				selectActiveTab(useQuesterStore.getState())?.kind === "request",
			run: () => {
				void useQuesterStore.getState().sendRequest();
			},
		},
		{
			id: "flow.stop",
			label: "Stop Run",
			group: "Edit",
			keywords: ["cancel", "abort"],
			keys: ["mod+."],
			when: () => selectActiveFlowRun(useQuesterStore.getState()).isRunning,
			run: () => {
				useQuesterStore.getState().stopFlow();
			},
		},
		{
			id: "tab.save",
			label: "Save",
			group: "File",
			keywords: ["write"],
			keys: ["mod+s"],
			run: () => {
				void useQuesterStore.getState().saveActiveTab();
			},
		},
		{
			id: "tab.close",
			label: "Close Tab",
			group: "File",
			keywords: ["close"],
			keys: ["mod+w"],
			when: () => Boolean(useQuesterStore.getState().activeTabId),
			run: () => {
				const { activeTabId, closeTab } = useQuesterStore.getState();
				if (activeTabId) void closeTab(activeTabId);
			},
		},
		{
			id: "preferences.open",
			label: "Preferences",
			group: "File",
			keywords: ["settings", "options", "theme", "tls"],
			keys: ["mod+comma"],
			run: () => {
				useQuesterStore.getState().openAppPreferences();
			},
		},
		{
			id: "workspace.settings",
			label: "Workspace Settings",
			group: "File",
			keywords: ["manifest", "http", "tls"],
			when: hasWorkspace,
			run: () => {
				void useQuesterStore.getState().openWorkspaceSettings();
			},
		},
		{
			id: "flow.new",
			label: "New Flow",
			group: "File",
			keywords: ["create", "add"],
			when: hasWorkspace,
			run: () => {
				void useQuesterStore.getState().createFlow();
			},
		},
		{
			id: "form.new",
			label: "New Form",
			group: "File",
			keywords: ["create"],
			when: hasWorkspace,
			run: () => {
				void useQuesterStore.getState().createForm();
			},
		},
		{
			id: "env.new",
			label: "New Environment",
			group: "File",
			keywords: ["create", "env"],
			when: hasWorkspace,
			run: () => {
				void useQuesterStore.getState().createEnv();
			},
		},
		{
			id: "request.new",
			label: "New Request",
			group: "File",
			keywords: ["create", "http", "collection"],
			when: hasWorkspace,
			run: () => {
				void useQuesterStore.getState().createRequest();
			},
		},
		{
			id: "collection.new",
			label: "New Collection",
			group: "File",
			keywords: ["create", "folder"],
			when: hasWorkspace,
			run: () => {
				void useQuesterStore.getState().createCollection();
			},
		},
		{
			id: "node.duplicate",
			label: "Duplicate Node",
			group: "Edit",
			keywords: ["copy", "clone"],
			when: () => useQuesterStore.getState().selectedNodeIds.length === 1,
			run: () => {
				const id = useQuesterStore.getState().selectedNodeIds[0];
				if (id) useQuesterStore.getState().duplicateNode(id);
			},
		},
		{
			id: "node.delete-selected",
			label: "Delete Selected Nodes",
			group: "Edit",
			keywords: ["remove"],
			when: () => useQuesterStore.getState().selectedNodeIds.length > 0,
			run: () => {
				const { selectedNodeIds, deleteNodes } = useQuesterStore.getState();
				deleteNodes(selectedNodeIds);
			},
		},
		{
			id: "view.flows",
			label: "Show Flows",
			group: "View",
			keywords: ["sidebar", "explorer"],
			run: () => {
				useQuesterStore.getState().handleActivityView("flows");
			},
		},
		{
			id: "view.forms",
			label: "Show Forms",
			group: "View",
			keywords: ["sidebar"],
			run: () => {
				useQuesterStore.getState().handleActivityView("forms");
			},
		},
		{
			id: "view.collections",
			label: "Show Collections",
			group: "View",
			keywords: ["sidebar", "requests"],
			run: () => {
				useQuesterStore.getState().handleActivityView("collections");
			},
		},
		{
			id: "view.envs",
			label: "Show Environments",
			group: "View",
			keywords: ["sidebar"],
			run: () => {
				useQuesterStore.getState().handleActivityView("envs");
			},
		},
		{
			id: "view.secrets",
			label: "Show Secrets",
			group: "View",
			keywords: ["sidebar"],
			run: () => {
				useQuesterStore.getState().handleActivityView("secrets");
			},
		},
		{
			id: "runs.open",
			label: "Show Runs",
			group: "View",
			keywords: ["logs", "history", "folder", "run logs"],
			run: () => {
				useQuesterStore.getState().handleActivityView("runs");
			},
		},
		{
			id: "view.nodes",
			label: "Show Nodes Palette",
			group: "View",
			keywords: ["sidebar", "add node", "catalog"],
			run: () => {
				useQuesterStore.getState().handleActivityView("nodes");
			},
		},
		{
			id: "sidebar.toggle",
			label: "Toggle Sidebar",
			group: "View",
			keywords: ["primary", "explorer"],
			keys: ["mod+b"],
			run: () => {
				const { sidebarOpen, setSidebarOpen } = useQuesterStore.getState();
				setSidebarOpen(!sidebarOpen);
			},
		},
		{
			id: "panel.toggle",
			label: "Toggle Bottom Panel",
			group: "View",
			keywords: ["console", "logs", "terminal"],
			keys: ["mod+j"],
			run: () => {
				useQuesterStore.getState().togglePanel();
			},
		},
		{
			id: "canvas.zoom-in",
			label: "Zoom In",
			group: "Canvas",
			keywords: ["magnify", "canvas"],
			keys: ["mod+=", "mod++"],
			run: () => {
				void callQuesterZoom("in").then((zoom) => {
					useQuesterStore.getState().setZoom(zoom);
				});
			},
		},
		{
			id: "canvas.align-left",
			label: "Align Left",
			group: "Canvas",
			keywords: ["multi", "selection", "layout"],
			when: () => useQuesterStore.getState().selectedNodeIds.length >= 2,
			run: () => {
				useQuesterStore.getState().alignSelectedNodes("left");
			},
		},
		{
			id: "canvas.align-right",
			label: "Align Right",
			group: "Canvas",
			keywords: ["multi", "selection", "layout"],
			when: () => useQuesterStore.getState().selectedNodeIds.length >= 2,
			run: () => {
				useQuesterStore.getState().alignSelectedNodes("right");
			},
		},
		{
			id: "canvas.align-top",
			label: "Align Top",
			group: "Canvas",
			keywords: ["multi", "selection", "layout"],
			when: () => useQuesterStore.getState().selectedNodeIds.length >= 2,
			run: () => {
				useQuesterStore.getState().alignSelectedNodes("top");
			},
		},
		{
			id: "canvas.align-bottom",
			label: "Align Bottom",
			group: "Canvas",
			keywords: ["multi", "selection", "layout"],
			when: () => useQuesterStore.getState().selectedNodeIds.length >= 2,
			run: () => {
				useQuesterStore.getState().alignSelectedNodes("bottom");
			},
		},
		{
			id: "canvas.distribute-horizontal",
			label: "Distribute Horizontally",
			group: "Canvas",
			keywords: ["multi", "selection", "layout", "space"],
			when: () => useQuesterStore.getState().selectedNodeIds.length >= 3,
			run: () => {
				useQuesterStore.getState().distributeSelectedNodes("horizontal");
			},
		},
		{
			id: "canvas.distribute-vertical",
			label: "Distribute Vertically",
			group: "Canvas",
			keywords: ["multi", "selection", "layout", "space"],
			when: () => useQuesterStore.getState().selectedNodeIds.length >= 3,
			run: () => {
				useQuesterStore.getState().distributeSelectedNodes("vertical");
			},
		},
		{
			id: "canvas.zoom-out",
			label: "Zoom Out",
			group: "Canvas",
			keywords: ["canvas"],
			keys: ["mod+-"],
			run: () => {
				void callQuesterZoom("out").then((zoom) => {
					useQuesterStore.getState().setZoom(zoom);
				});
			},
		},
		{
			id: "canvas.zoom-fit",
			label: "Zoom to Fit",
			group: "Canvas",
			keywords: ["fit", "canvas", "reset"],
			keys: ["mod+0"],
			run: () => {
				void callQuesterZoom("fit").then((zoom) => {
					useQuesterStore.getState().setZoom(zoom);
				});
			},
		},
		{
			id: "workspace.open",
			label: "Open Workspace",
			group: "File",
			keywords: ["folder", "project"],
			keys: ["mod+o"],
			run: () => {
				void useQuesterStore.getState().openWorkspacePicker();
			},
		},
		{
			id: "workspace.create",
			label: "Create Workspace",
			group: "File",
			keywords: ["folder", "new", "project"],
			run: () => {
				void useQuesterStore.getState().createWorkspaceViaPicker();
			},
		},
		{
			id: "workspace.sample",
			label: "Open Sample Workspace",
			group: "File",
			keywords: ["demo", "example"],
			run: () => {
				void useQuesterStore.getState().openSampleWorkspace();
			},
		},
		{
			id: "workspace.close",
			label: "Close Workspace",
			group: "File",
			keywords: ["quit", "leave"],
			when: hasWorkspace,
			run: () => {
				useQuesterStore.getState().closeWorkspace();
			},
		},
		{
			id: "help.open",
			label: "Help",
			group: "Help",
			keywords: ["docs", "documentation", "guide"],
			run: () => {
				window.open(DOCS_URL, "_blank", "noopener,noreferrer");
			},
		},
	];
}

export function getVisibleCommands(): AppCommand[] {
	return buildAppCommands().filter(
		(command) => !command.when || command.when(),
	);
}

export function runCommand(id: string): void {
	const command = buildAppCommands().find((entry) => entry.id === id);
	if (!command) return;
	if (command.when && !command.when()) return;
	command.run();
}

function fuzzySubsequence(text: string, query: string): boolean {
	let qi = 0;
	for (let ti = 0; ti < text.length && qi < query.length; ti += 1) {
		if (text[ti] === query[qi]) qi += 1;
	}
	return qi === query.length;
}

function commandMatchScore(command: AppCommand, query: string): number {
	const haystack = [command.label, ...(command.keywords ?? [])]
		.join(" ")
		.toLowerCase();
	if (haystack.includes(query)) {
		return 100 + (haystack.startsWith(query) ? 10 : 0);
	}
	const tokens = query.split(/\s+/).filter(Boolean);
	if (tokens.length > 0 && tokens.every((token) => haystack.includes(token))) {
		return 50;
	}
	if (fuzzySubsequence(command.label.toLowerCase(), query)) return 25;
	return 0;
}

/** Fuzzy filter for the command palette query. */
export function filterCommands(
	commands: readonly AppCommand[],
	query: string,
): AppCommand[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) return [...commands];
	return commands
		.map((command) => ({
			command,
			score: commandMatchScore(command, normalized),
		}))
		.filter(({ score }) => score > 0)
		.sort((left, right) => right.score - left.score)
		.map(({ command }) => command);
}

function normalizeBindingKey(key: string): string {
	const lower = key.toLowerCase();
	if (lower === "equal" || lower === "=") return "=";
	if (lower === "minus" || lower === "-") return "-";
	if (lower === "plus" || lower === "+") return "+";
	if (lower === "period" || lower === ".") return ".";
	if (lower === "enter" || lower === "return") return "enter";
	if (lower === "0") return "0";
	if (lower === "comma" || lower === ",") return ",";
	return lower.length === 1 ? lower : lower;
}

function parseBinding(binding: CommandKeyBinding): {
	mod: boolean;
	shift: boolean;
	key: string;
} {
	const parts = binding.toLowerCase().split("+").filter(Boolean);
	let mod = false;
	let shift = false;
	let key = "";
	for (const part of parts) {
		if (
			part === "mod" ||
			part === "ctrl" ||
			part === "meta" ||
			part === "cmd"
		) {
			mod = true;
			continue;
		}
		if (part === "shift") {
			shift = true;
			continue;
		}
		key = normalizeBindingKey(part);
	}
	return { mod, shift, key };
}

export function matchesKeyBinding(
	event: KeyboardEvent,
	binding: CommandKeyBinding,
): boolean {
	const parsed = parseBinding(binding);
	const mod = event.metaKey || event.ctrlKey;
	if (parsed.mod !== mod) return false;
	if (parsed.shift !== event.shiftKey) return false;
	if (event.altKey) return false;

	const eventKey = normalizeBindingKey(event.key);
	if (parsed.key === eventKey) return true;
	if (parsed.key === "=" && eventKey === "+") return true;
	return false;
}

export function findCommandForKeyboardEvent(
	event: KeyboardEvent,
): AppCommand | null {
	for (const command of buildAppCommands()) {
		if (!command.keys?.length) continue;
		if (command.when && !command.when()) continue;
		for (const binding of command.keys) {
			if (matchesKeyBinding(event, binding)) return command;
		}
	}
	return null;
}

export function formatKeyBinding(binding: CommandKeyBinding): string {
	return binding
		.split("+")
		.map((part) => {
			const lower = part.toLowerCase();
			if (lower === "mod") return "Ctrl/⌘";
			if (lower === "shift") return "Shift";
			if (lower === "enter") return "Enter";
			if (lower === ".") return ".";
			if (lower === "=" || lower === "equal") return "=";
			if (lower === "-" || lower === "minus") return "−";
			if (lower === "0") return "0";
			if (lower === "," || lower === "comma") return ",";
			return part.length === 1 ? part.toUpperCase() : part;
		})
		.join("+");
}

export function getShortcutRows(): Array<{ action: string; keys: string }> {
	const seen = new Set<string>();
	const rows: Array<{ action: string; keys: string }> = [];
	for (const command of buildAppCommands()) {
		if (!command.keys?.length) continue;
		const keys = command.keys.map(formatKeyBinding).join(" / ");
		const dedupeKey = `${command.label}:${keys}`;
		if (seen.has(dedupeKey)) continue;
		seen.add(dedupeKey);
		rows.push({ action: command.label, keys });
	}
	return rows;
}
