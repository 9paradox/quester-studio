import { JsonViewer } from "@/components/JsonViewer.js";
import { Button } from "@/components/ui/button.js";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog.js";
import { Separator } from "@/components/ui/separator.js";
import { getNodePresentation } from "@/lib/nodeCatalog.js";
import type { BuiltinNodeType } from "@quester/schema";
import { IconHelp } from "@tabler/icons-react";
import { useState } from "react";

type NodeHelpDialogProps = {
	type: BuiltinNodeType;
};

export function NodeHelpDialog({ type }: NodeHelpDialogProps) {
	const [open, setOpen] = useState(false);
	const presentation = getNodePresentation(type);
	const { help, label, icon: Icon } = presentation;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={`Help for ${label}`}
						title={`Help: ${label}`}
					/>
				}
			>
				<IconHelp className="size-4" />
			</DialogTrigger>
			<DialogContent className="flex max-h-[min(85vh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
				{open ? (
					<>
						<DialogHeader className="shrink-0 border-b px-4 py-3 pr-12">
							<div className="flex items-center gap-2">
								<span className="flex size-7 items-center justify-center rounded-md bg-muted">
									<Icon className="size-4" />
								</span>
								<div className="min-w-0">
									<DialogTitle>{label}</DialogTitle>
									<DialogDescription className="mt-0.5">
										{help.summary}
									</DialogDescription>
								</div>
							</div>
						</DialogHeader>
						{/* Native overflow avoids the custom scrollbar cost in this modal. */}
						<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
							<div className="flex flex-col gap-4">
								<section className="flex flex-col gap-2">
									<h3 className="text-xs font-medium text-muted-foreground">
										Configuration
									</h3>
									<div className="overflow-hidden rounded-md border">
										<table className="w-full text-left text-[11px]">
											<thead className="border-b bg-muted/40 text-muted-foreground">
												<tr>
													<th className="px-2 py-1.5 font-medium">Field</th>
													<th className="px-2 py-1.5 font-medium">Type</th>
													<th className="px-2 py-1.5 font-medium">
														Description
													</th>
												</tr>
											</thead>
											<tbody>
												{help.fields.map((field) => (
													<tr
														key={field.name}
														className="border-b border-border/60 last:border-0"
													>
														<td className="px-2 py-1.5 align-top font-mono font-medium">
															{field.name}
														</td>
														<td className="px-2 py-1.5 align-top font-mono text-muted-foreground">
															{field.type}
														</td>
														<td className="px-2 py-1.5 align-top text-muted-foreground">
															{field.description}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</section>

								{help.syntax && help.syntax.length > 0 ? (
									<section className="flex flex-col gap-2">
										<h3 className="text-xs font-medium text-muted-foreground">
											Syntax tips
										</h3>
										<ul className="list-inside list-disc space-y-1 text-[11px] text-muted-foreground">
											{help.syntax.map((tip) => (
												<li
													key={tip}
													className="font-mono text-[10px] text-foreground"
												>
													{tip}
												</li>
											))}
										</ul>
									</section>
								) : null}

								{help.io ? (
									<section className="flex flex-col gap-1.5">
										<h3 className="text-xs font-medium text-muted-foreground">
											Input / output
										</h3>
										<p className="text-[11px] text-muted-foreground">
											<span className="font-medium text-foreground">
												Input:
											</span>{" "}
											{help.io.input}
										</p>
										<p className="text-[11px] text-muted-foreground">
											<span className="font-medium text-foreground">
												Output:
											</span>{" "}
											{help.io.output}
										</p>
									</section>
								) : null}

								<Separator />

								<section className="flex flex-col gap-2">
									<h3 className="text-xs font-medium text-muted-foreground">
										Example data
									</h3>
									<JsonViewer
										value={help.example}
										defaultExpandedDepth={2}
										showCopy={false}
									/>
								</section>
							</div>
						</div>
					</>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
