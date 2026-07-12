import type { BuiltinNodeType } from "@quester/schema";
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

export type ActivityView =
	| "flows"
	| "collections"
	| "envs"
	| "secrets"
	| "nodes"
	| "settings";

type CatalogIcon = ComponentType<
	SVGProps<SVGSVGElement> & { className?: string }
>;

export type NodeCatalogEntry = {
	type: BuiltinNodeType;
	label: string;
	description: string;
	icon: CatalogIcon;
};

export type NodeCatalogGroup = {
	title: string;
	nodes: NodeCatalogEntry[];
};

export const nodeCatalogGroups: NodeCatalogGroup[] = [
	{
		title: "Input & Output",
		nodes: [
			{
				type: "start",
				label: "Start",
				description: "Flow entry (one only)",
				icon: IconFlag,
			},
			{
				type: "input",
				label: "Input",
				description: "Run payload on the wire",
				icon: IconArrowBarToDown,
			},
			{
				type: "output",
				label: "Output",
				description: "Flow result",
				icon: IconArrowBarToUp,
			},
			{
				type: "json",
				label: "JSON",
				description: "Display JSON on canvas",
				icon: IconJson,
			},
		],
	},
	{
		title: "HTTP",
		nodes: [
			{
				type: "http",
				label: "HTTP",
				description: "HTTP request",
				icon: IconWorld,
			},
		],
	},
	{
		title: "Transform",
		nodes: [
			{
				type: "extract",
				label: "Extract",
				description: "Extract JSON field",
				icon: IconBraces,
			},
			{
				type: "template",
				label: "Template",
				description: "Render template",
				icon: IconCode,
			},
			{
				type: "set",
				label: "Set",
				description: "Set variables",
				icon: IconVariable,
			},
			{
				type: "transform",
				label: "Transform",
				description: "Map fields with JMESPath",
				icon: IconTransform,
			},
			{
				type: "merge",
				label: "Merge",
				description: "Deep-merge objects",
				icon: IconGitMerge,
			},
		],
	},
	{
		title: "Logic",
		nodes: [
			{
				type: "if",
				label: "If",
				description: "Conditional branch",
				icon: IconGitBranch,
			},
			{
				type: "assert",
				label: "Assert",
				description: "Fail on failed checks",
				icon: IconCheck,
			},
		],
	},
];

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
				url: "",
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
				checks: [{ path: "status", equals: 200 }],
			};
		case "transform":
			return { label: "Transform", map: {} };
		case "merge":
			return { label: "Merge", sources: ["previous"] };
		case "json":
			return { label: "JSON" };
		default:
			return { label: type };
	}
}

export function newNodeId(type: BuiltinNodeType): string {
	return `${type}-${crypto.randomUUID().slice(0, 8)}`;
}
