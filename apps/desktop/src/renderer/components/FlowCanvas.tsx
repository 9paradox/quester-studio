import type { FlowV1 } from "@quester/schema";
import { useMemo } from "react";
import {
	Background,
	Controls,
	MiniMap,
	ReactFlow,
	ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { flowToReactFlow } from "../lib/flowToReactFlow.js";

type FlowCanvasProps = {
	flow: FlowV1 | null;
};

function FlowCanvasInner({ flow }: { flow: FlowV1 }) {
	const { nodes, edges } = useMemo(() => flowToReactFlow(flow), [flow]);

	return (
		<ReactFlow key={flow.id} nodes={nodes} edges={edges} fitView>
			<Background />
			<MiniMap />
			<Controls />
		</ReactFlow>
	);
}

export function FlowCanvas({ flow }: FlowCanvasProps) {
	if (!flow) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
				Select a flow to view the canvas
			</div>
		);
	}

	return (
		<ReactFlowProvider>
			<div className="h-full w-full bg-background">
				<FlowCanvasInner flow={flow} />
			</div>
		</ReactFlowProvider>
	);
}
