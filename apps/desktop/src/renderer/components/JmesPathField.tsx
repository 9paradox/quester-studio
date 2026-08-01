import { TemplateField } from "@/components/TemplateField.js";
import { Button } from "@/components/ui/button.js";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog.js";
import { ScrollArea } from "@/components/ui/scroll-area.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import { selectTemplateContext } from "@/stores/selectors.js";
import { IconListSearch } from "@tabler/icons-react";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";

type JmesPathFieldProps = {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	/** Show short JMESPath help under the field. Default true. */
	showHelp?: boolean;
};

export function JmesPathHelpText() {
	return (
		<p className="text-[11px] leading-relaxed text-muted-foreground">
			JMESPath selects values from JSON. Examples:{" "}
			<code className="font-mono text-[10px]">body.id</code> for a nested field,{" "}
			<code className="font-mono text-[10px]">[*].name</code> for each
			item&apos;s name.{" "}
			<a
				href="https://jmespath.org/"
				target="_blank"
				rel="noopener noreferrer"
				className="underline underline-offset-2 hover:text-foreground"
			>
				JMESPath docs
			</a>
		</p>
	);
}

export function JmesPathField({
	id,
	value,
	onChange,
	placeholder,
	showHelp = true,
}: JmesPathFieldProps) {
	// selectTemplateContext allocates new objects/arrays each call — useShallow
	// (and selecting only paths) keeps useSyncExternalStore from looping (#185).
	const paths = useQuesterStore(
		useShallow((state) => {
			const ctx = selectTemplateContext(state);
			return ctx.previousPaths.length > 0 ? ctx.previousPaths : ctx.jmesPaths;
		}),
	);
	const [open, setOpen] = useState(false);

	const pickPath = (path: string) => {
		onChange(path);
		setOpen(false);
	};

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-start gap-2">
				<div className="min-w-0 flex-1">
					<TemplateField
						id={id}
						value={value}
						onChange={onChange}
						placeholder={placeholder}
						completionMode="jmespath"
					/>
				</div>
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogTrigger
						render={
							<Button
								type="button"
								variant="outline"
								size="xs"
								className="shrink-0"
								title="Insert a path from the previous node output"
							/>
						}
					>
						<IconListSearch data-icon="inline-start" />
						Pick path
					</DialogTrigger>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>Pick JMESPath</DialogTitle>
							<DialogDescription>
								Paths from the previous node output (contracts and last run).
							</DialogDescription>
						</DialogHeader>
						{paths.length === 0 ? (
							<p className="text-xs text-muted-foreground">
								No paths yet. Run the flow or wire a predecessor node.
							</p>
						) : (
							<ScrollArea className="max-h-64">
								<ul className="flex flex-col gap-0.5 pr-3">
									{paths.map((path) => (
										<li key={path}>
											<button
												type="button"
												className="w-full rounded-md px-2 py-1.5 text-left font-mono text-xs hover:bg-muted"
												onClick={() => pickPath(path)}
											>
												{path}
											</button>
										</li>
									))}
								</ul>
							</ScrollArea>
						)}
					</DialogContent>
				</Dialog>
			</div>
			{showHelp ? <JmesPathHelpText /> : null}
		</div>
	);
}
