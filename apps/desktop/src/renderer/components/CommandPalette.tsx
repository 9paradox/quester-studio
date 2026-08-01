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
	filterCommands,
	formatKeyBinding,
	getVisibleCommands,
	runCommand,
	setCommandPaletteOpen,
	subscribeCommandPalette,
} from "@/lib/commands.js";
import { useEffect, useState } from "react";

export function CommandPalette() {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);

	useEffect(() => subscribeCommandPalette(setOpen), []);

	const commands = filterCommands(getVisibleCommands(), query);

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
						<CommandGroup>
							{commands.map((command, index) => (
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
							))}
						</CommandGroup>
					)}
				</CommandList>
			</Command>
		</CommandDialog>
	);
}
