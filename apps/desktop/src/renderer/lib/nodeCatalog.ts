import { type NodeHelp, nodeHelpByType } from "@/lib/nodeHelp.js";
import { type BuiltinNodeType, builtinNodeTypes } from "@quester/schema";
import {
	IconArrowBarToDown,
	IconArrowBarToUp,
	IconBraces,
	IconCheck,
	IconCode,
	IconFlag,
	IconGitBranch,
	IconGitMerge,
	IconJson,
	IconTransform,
	IconVariable,
	IconWorld,
} from "@tabler/icons-react";
import type { ComponentType, SVGProps } from "react";

export type { NodeHelp, NodeHelpField } from "@/lib/nodeHelp.js";
export { getNodeHelp } from "@/lib/nodeHelp.js";

export type ActivityView =
	| "flows"
	| "collections"
	| "envs"
	| "secrets"
	| "nodes"
	| "settings";

export type CatalogIcon = ComponentType<
	SVGProps<SVGSVGElement> & { className?: string }
>;

export type NodePresentation = {
	type: BuiltinNodeType;
	label: string;
	description: string;
	icon: CatalogIcon;
	/** Left-border accent — must not use destructive (reserved for run failure). */
	accentTone: string;
	badgeTone: string;
	help: NodeHelp;
};

export type NodeCatalogEntry = Pick<
	NodePresentation,
	"type" | "label" | "description" | "icon"
>;

export type NodeCatalogGroup = {
	title: string;
	nodes: NodeCatalogEntry[];
};

/** Single source of truth for palette + canvas chrome. */
function withHelp(entry: Omit<NodePresentation, "help">): NodePresentation {
	return { ...entry, help: nodeHelpByType[entry.type] };
}

export const nodePresentation: Record<BuiltinNodeType, NodePresentation> = {
	start: withHelp({
		type: "start",
		label: "Start",
		description: "Flow entry (one only)",
		icon: IconFlag,
		accentTone: "border-l-foreground",
		badgeTone: "bg-foreground/10 text-foreground",
	}),
	input: withHelp({
		type: "input",
		label: "Input",
		description: "Run payload on the wire",
		icon: IconArrowBarToDown,
		accentTone: "border-l-chart-2",
		badgeTone: "bg-chart-2/15 text-chart-2",
	}),
	output: withHelp({
		type: "output",
		label: "Output",
		description: "Flow result",
		icon: IconArrowBarToUp,
		accentTone: "border-l-muted-foreground",
		badgeTone: "bg-muted text-muted-foreground",
	}),
	json: withHelp({
		type: "json",
		label: "JSON",
		description: "Display JSON on canvas",
		icon: IconJson,
		accentTone: "border-l-chart-3",
		badgeTone: "bg-chart-3/15 text-chart-3",
	}),
	http: withHelp({
		type: "http",
		label: "HTTP",
		description: "HTTP request",
		icon: IconWorld,
		accentTone: "border-l-primary",
		badgeTone: "bg-primary/15 text-primary",
	}),
	extract: withHelp({
		type: "extract",
		label: "Extract",
		description: "Extract JSON field",
		icon: IconBraces,
		accentTone: "border-l-chart-1",
		badgeTone: "bg-chart-1/15 text-chart-1",
	}),
	template: withHelp({
		type: "template",
		label: "Template",
		description: "Render template",
		icon: IconCode,
		accentTone: "border-l-chart-3",
		badgeTone: "bg-chart-3/15 text-chart-3",
	}),
	set: withHelp({
		type: "set",
		label: "Set",
		description: "Set variables",
		icon: IconVariable,
		accentTone: "border-l-muted-foreground/50",
		badgeTone: "bg-muted text-muted-foreground",
	}),
	transform: withHelp({
		type: "transform",
		label: "Transform",
		description: "Map fields with JMESPath",
		icon: IconTransform,
		accentTone: "border-l-chart-1",
		badgeTone: "bg-chart-1/15 text-chart-1",
	}),
	merge: withHelp({
		type: "merge",
		label: "Merge",
		description: "Deep-merge objects",
		icon: IconGitMerge,
		accentTone: "border-l-chart-4",
		badgeTone: "bg-chart-4/15 text-foreground",
	}),
	if: withHelp({
		type: "if",
		label: "If",
		description: "Conditional branch",
		icon: IconGitBranch,
		accentTone: "border-l-chart-4",
		badgeTone: "bg-chart-4/15 text-foreground",
	}),
	assert: withHelp({
		type: "assert",
		label: "Assert",
		description: "Fail on failed checks",
		icon: IconCheck,
		// chart-5 is near-black and disappears on dark cards; use a visible accent.
		accentTone: "border-l-chart-1",
		badgeTone: "bg-chart-1/15 text-chart-1",
	}),
};

const catalogGroupOrder: { title: string; types: BuiltinNodeType[] }[] = [
	{ title: "Input & Output", types: ["start", "input", "output", "json"] },
	{ title: "HTTP", types: ["http"] },
	{
		title: "Transform",
		types: ["extract", "template", "set", "transform", "merge"],
	},
	{ title: "Logic", types: ["if", "assert"] },
];

export const nodeCatalogGroups: NodeCatalogGroup[] = catalogGroupOrder.map(
	(group) => ({
		title: group.title,
		nodes: group.types.map((type) => {
			const p = nodePresentation[type];
			return {
				type: p.type,
				label: p.label,
				description: p.description,
				icon: p.icon,
			};
		}),
	}),
);

export function getNodePresentation(type: BuiltinNodeType): NodePresentation {
	return nodePresentation[type];
}

/** True when idle/default chrome classes avoid destructive (error) semantics. */
export function presentationUsesDestructive(type: BuiltinNodeType): boolean {
	const p = nodePresentation[type];
	return (
		p.accentTone.includes("destructive") || p.badgeTone.includes("destructive")
	);
}

export function defaultNodeData(
	type: BuiltinNodeType,
): Record<string, unknown> {
	switch (type) {
		case "start":
			return { label: "Start" };
		case "input":
			return { label: "Input" };
		case "http":
			return {
				label: "HTTP Request",
				method: "GET",
				url: "https://example.com",
				headers: {},
			};
		case "extract":
			return { label: "Extract", expression: "body" };
		case "template":
			return { label: "Template", template: "{{input}}" };
		case "set":
			return { label: "Set", variables: {} };
		case "if":
			return { label: "Condition", condition: "true" };
		case "output":
			return { label: "Output" };
		case "assert":
			return {
				label: "Assert",
				checks: [{ path: "ok" }],
			};
		case "transform":
			return { label: "Transform", map: {} };
		case "merge":
			return { label: "Merge", sources: ["previous"] };
		case "json":
			return { label: "JSON" };
		default: {
			const _exhaustive: never = type;
			return { label: _exhaustive };
		}
	}
}

export function newNodeId(type: BuiltinNodeType): string {
	return `${type}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Compile-time / test helper: every builtin type has presentation metadata. */
export function allPresentationTypes(): BuiltinNodeType[] {
	return [...builtinNodeTypes];
}
