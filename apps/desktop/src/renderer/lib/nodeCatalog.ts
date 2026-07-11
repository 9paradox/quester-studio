import type { BuiltinNodeType } from "@quester/schema";
import {
	IconArrowBarToDown,
	IconArrowBarToUp,
	IconBraces,
	IconCode,
	IconGitBranch,
	IconVariable,
	IconWorld,
} from "@tabler/icons-react";
import type { ComponentType, SVGProps } from "react";

export type ActivityView = "flows" | "envs" | "secrets" | "nodes";

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
				type: "input",
				label: "Input",
				description: "Flow entry point",
				icon: IconArrowBarToDown,
			},
			{
				type: "output",
				label: "Output",
				description: "Flow result",
				icon: IconArrowBarToUp,
			},
		],
	},
	{
		title: "HTTP & Data",
		nodes: [
			{
				type: "http",
				label: "HTTP",
				description: "HTTP request",
				icon: IconWorld,
			},
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
		],
	},
];

export function defaultNodeData(
	type: BuiltinNodeType,
): Record<string, unknown> {
	switch (type) {
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
			return { label: "Extract", expression: "body", source: "previous" };
		case "template":
			return { label: "Template", template: "{{input}}" };
		case "set":
			return { label: "Set", variables: {} };
		case "if":
			return { label: "Condition", condition: "true" };
		case "output":
			return { label: "Output" };
		default:
			return { label: type };
	}
}

export function newNodeId(type: BuiltinNodeType): string {
	return `${type}-${crypto.randomUUID().slice(0, 8)}`;
}
