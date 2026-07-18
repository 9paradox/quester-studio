import { Button } from "@/components/ui/button.js";
import { cn } from "@/lib/utils.js";
import { IconCopy } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { JsonView } from "react-json-view-lite";

type JsonViewerProps = {
	value: unknown;
	className?: string;
	defaultExpandedDepth?: number;
	showCopy?: boolean;
};

export function stringifyJson(value: unknown): string {
	try {
		return JSON.stringify(value, null, 2) ?? String(value);
	} catch {
		return String(value);
	}
}

const jsonViewStyles = {
	container: "quester-json-view",
	basicChildStyle: "quester-json-child",
	childFieldsContainer: "quester-json-children",
	label: "quester-json-label",
	clickableLabel: "quester-json-label quester-json-clickable",
	nullValue: "quester-json-null",
	undefinedValue: "quester-json-null",
	numberValue: "quester-json-number",
	stringValue: "quester-json-string",
	booleanValue: "quester-json-boolean",
	otherValue: "quester-json-other",
	punctuation: "quester-json-punctuation",
	collapseIcon: "quester-json-toggle quester-json-collapse",
	expandIcon: "quester-json-toggle quester-json-expand",
	collapsedContent: "quester-json-collapsed",
	stringifyStringValues: true,
} as const;

export function JsonViewer({
	value,
	className,
	defaultExpandedDepth = 2,
	showCopy = true,
}: JsonViewerProps) {
	const [copied, setCopied] = useState(false);
	const shouldExpandNode = useCallback(
		(level: number) => level < defaultExpandedDepth,
		[defaultExpandedDepth],
	);

	const copy = async () => {
		await navigator.clipboard.writeText(stringifyJson(value));
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1200);
	};

	return (
		<div
			className={cn("relative rounded-md border bg-muted/20 p-2.5", className)}
		>
			{showCopy ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					className="absolute top-1.5 right-1.5"
					onClick={() => void copy()}
					aria-label="Copy JSON"
				>
					{copied ? (
						<span className="text-[10px] text-muted-foreground">OK</span>
					) : (
						<IconCopy />
					)}
				</Button>
			) : null}
			<div className={cn(showCopy && "pr-7")}>
				<JsonView
					data={value as object}
					style={jsonViewStyles}
					shouldExpandNode={shouldExpandNode}
					clickToExpandNode
				/>
			</div>
		</div>
	);
}
