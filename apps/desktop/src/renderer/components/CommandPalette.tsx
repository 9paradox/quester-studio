import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
} from "@/components/ui/command.js";
import {
	type AppCommand,
	type AppCommandGroup,
	filterCommands,
	formatKeyBinding,
	getVisibleCommands,
	runCommand,
	setCommandPaletteOpen,
	subscribeCommandPalette,
} from "@/lib/commands.js";
import { useEffect, useState } from "react";

const GROUP_ORDER: AppCommandGroup[] = [
	"File",
	"Edit",
	"View",
	"Canvas",
	"Help",
];

function groupCommands(
	commands: AppCommand[],
): Array<{ heading: string; items: AppCommand[] }> {
	const buckets = new Map<string, AppCommand[]>();
	for (const command of commands) {
		const heading = command.group ?? "Commands";
		const list = buckets.get(heading) ?? [];
		list.push(command);
		buckets.set(heading, list);
	}
	const headings = [
		...GROUP_ORDER.filter((heading) => buckets.has(heading)),
		...[...buckets.keys()].filter(
			(heading) => !GROUP_ORDER.includes(heading as AppCommandGroup),
		),
	];
	return headings.map((heading) => ({
		heading,
		items: buckets.get(heading) ?? [],
	}));
}

export function CommandPalette() {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);

	useEffect(() => subscribeCommandPalette(setOpen), []);

	const groups = groupCommands(filterCommands(getVisibleCommands(), query));
	const commands = groups.flatMap((group) => group.items);

	useEffect(() => {
		if (!open) {
			setQuery("");
			setSelectedIndex(0);
			return;
		}
		setSelectedIndex(0);
	}, [open]);

	useEffect(() => {
		setSelectedIndex((index) =>
			commands.length === 0 ? 0 : Math.min(index, commands.length - 1),
		);
	}, [commands.length]);

	const execute = (id: string) => {
		runCommand(id);
		setCommandPaletteOpen(false);
	};

	return (
		<CommandDialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				setCommandPaletteOpen(nextOpen);
			}}
		>
			<Command
				onKeyDown={(event) => {
					if (event.key === "ArrowDown") {
						event.preventDefault();
						setSelectedIndex((index) =>
							commands.length === 0 ? 0 : (index + 1) % commands.length,
						);
						return;
					}
					if (event.key === "ArrowUp") {
						event.preventDefault();
						setSelectedIndex((index) =>
							commands.length === 0
								? 0
								: (index - 1 + commands.length) % commands.length,
						);
						return;
					}
					if (event.key === "Enter") {
						event.preventDefault();
						const selected = commands[selectedIndex];
						if (selected) execute(selected.id);
					}
				}}
			>
				<CommandInput
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Type a command…"
					autoFocus
				/>
				<CommandList>
					{commands.length === 0 ? (
						<CommandEmpty>No matching commands.</CommandEmpty>
					) : (
						groups.map((group) => {
							const offset = commands.findIndex(
								(command) => command.id === group.items[0]?.id,
							);
							return (
								<CommandGroup key={group.heading} heading={group.heading}>
									{group.items.map((command, localIndex) => {
										const index =
											offset === -1 ? localIndex : offset + localIndex;
										return (
											<CommandItem
												key={command.id}
												selected={index === selectedIndex}
												onMouseEnter={() => setSelectedIndex(index)}
												onClick={() => execute(command.id)}
											>
												<span>{command.label}</span>
												{command.keys?.[0] ? (
													<CommandShortcut>
														{formatKeyBinding(command.keys[0])}
													</CommandShortcut>
												) : null}
											</CommandItem>
										);
									})}
								</CommandGroup>
							);
						})
					)}
				</CommandList>
			</Command>
		</CommandDialog>
	);
}
