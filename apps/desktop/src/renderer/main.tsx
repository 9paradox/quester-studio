import React, { useMemo } from "react";
import { createRoot } from "react-dom/client";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";
import sampleFlow from "../../../../examples/sample-workspace/flows/login-and-profile.flow.json";
import "./styles.css";

function App() {
	const { nodes, edges } = useMemo(() => {
		const nodes = sampleFlow.nodes.map(
			(n: {
				id: string;
				type: string;
				position?: { x: number; y: number };
				data: { label?: string };
			}) => ({
				id: n.id,
				type: "default",
				position: n.position ?? { x: 0, y: 0 },
				data: { label: n.data?.label ?? `${n.type} (${n.id})` },
			}),
		);
		const edges = sampleFlow.edges.map(
			(e: { id: string; source: string; target: string }) => ({
				id: e.id,
				source: e.source,
				target: e.target,
			}),
		);
		return { nodes, edges };
	}, []);

	return (
		<div className="h-screen w-screen">
			<header className="border-b px-4 py-2 text-sm font-medium">
				Quester — local-first flow builder
			</header>
			<div className="h-[calc(100vh-40px)]">
				<ReactFlow nodes={nodes} edges={edges} fitView>
					<Background />
					<MiniMap />
					<Controls />
				</ReactFlow>
			</div>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) createRoot(rootEl).render(<App />);
