import { JsonViewer, stringifyJson } from "@/components/JsonViewer.js";
import { Button } from "@/components/ui/button.js";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs.js";
import { Textarea } from "@/components/ui/textarea.js";
import { cn } from "@/lib/utils.js";
import { IconCopy } from "@tabler/icons-react";
import { useMemo, useState } from "react";

type JsonPaneProps = {
	value: unknown;
	className?: string;
	defaultExpandedDepth?: number;
	/** When set, shows an editable Raw tab that calls onEdit */
	editable?: boolean;
	onEdit?: (raw: string) => void;
	editError?: string | null;
	/** Show the Pretty/Raw tabs. Disable when a sibling Raw view already exists. */
	showRaw?: boolean;
};

/** Body pane with tree and raw text views plus copy support. */
export function JsonPane({
	value,
	className,
	defaultExpandedDepth = 3,
	editable = false,
	onEdit,
	editError,
	showRaw = true,
}: JsonPaneProps) {
	const [copied, setCopied] = useState(false);
	const raw = useMemo(() => {
		if (typeof value === "string") {
			try {
				return stringifyJson(JSON.parse(value));
			} catch {
				return value;
			}
		}
		return stringifyJson(value);
	}, [value]);

	const treeValue = useMemo(() => {
		if (typeof value === "string") {
			try {
				return JSON.parse(value) as unknown;
			} catch {
				return value;
			}
		}
		return value;
	}, [value]);

	const copy = async () => {
		await navigator.clipboard.writeText(raw);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1200);
	};

	const copyButton = (
		<Button
			type="button"
			variant="ghost"
			size="icon-xs"
			onClick={() => void copy()}
			aria-label="Copy"
		>
			{copied ? (
				<span className="text-[10px] text-muted-foreground">OK</span>
			) : (
				<IconCopy />
			)}
		</Button>
	);

	if (!showRaw && !editable) {
		return (
			<div className={cn("relative flex flex-col gap-2", className)}>
				<div className="absolute top-1 right-1 z-10">{copyButton}</div>
				<JsonViewer
					value={treeValue}
					defaultExpandedDepth={defaultExpandedDepth}
					showCopy={false}
				/>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<Tabs defaultValue="tree">
				<div className="flex items-center gap-2">
					<TabsList variant="line" className="h-8 flex-1 justify-start">
						<TabsTrigger value="tree" className="text-xs">
							Pretty
						</TabsTrigger>
						<TabsTrigger value="raw" className="text-xs">
							Raw
						</TabsTrigger>
					</TabsList>
					{copyButton}
				</div>
				<TabsContent value="tree" className="mt-2">
					<JsonViewer
						value={treeValue}
						defaultExpandedDepth={defaultExpandedDepth}
						showCopy={false}
					/>
				</TabsContent>
				<TabsContent value="raw" className="mt-2">
					{editable && onEdit ? (
						<>
							<Textarea
								value={typeof value === "string" ? value : stringifyJson(value)}
								onChange={(e) => onEdit(e.target.value)}
								className="min-h-40 font-mono text-xs"
								spellCheck={false}
							/>
							{editError ? (
								<p className="mt-1 text-xs text-destructive">{editError}</p>
							) : null}
						</>
					) : (
						<pre className="max-h-80 overflow-auto rounded-md border bg-muted/20 p-2.5 font-mono text-[11px] leading-5 whitespace-pre-wrap break-all">
							{raw}
						</pre>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
