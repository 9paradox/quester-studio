import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "@/components/ui/context-menu.js";
import {
	CANVAS_MAX_ZOOM,
	CANVAS_MIN_ZOOM,
	readCanvasViewport,
	writeCanvasViewport,
} from "@/lib/canvasViewport.js";
import { readNodeDragData, readRequestDragData } from "@/lib/dnd.js";
import { flowToReactFlow, reactFlowToFlow } from "@/lib/flowEditor.js";
import type { BuiltinNodeType, FlowV1 } from "@quester/schema";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Background,
	BackgroundVariant,
	type Connection,
	type Edge,
	type EdgeChange,
	type Node,
	type NodeChange,
	ReactFlow,
	ReactFlowProvider,
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
	useNodesInitialized,
	useOnSelectionChange,
	useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { flowNodeTypes } from "./nodes/FlowNodes.js";

type FlowCanvasProps = {
	flow: FlowV1 | null;
	workspacePath?: string;
	onGraphChange?: (nodes: Node[], edges: Edge[]) => void;
	onSelectNode?: (nodeId: string | null) => void;
	onZoomChange?: (zoom: number) => void;
	onDeleteNodes?: (nodeIds: string[]) => void;
	onDeleteEdges?: (edgeIds: string[]) => void;
	onDuplicateNode?: (nodeId: string) => void;
	onAddNode?: (
		type: BuiltinNodeType,
		position: { x: number; y: number },
	) => void;
	onDropRequest?: (
		requestPath: string,
		position: { x: number; y: number },
	) => void;
	onSave?: () => void;
	canSave?: boolean;
};

type ContextTarget =
	| { kind: "node"; id: string }
	| { kind: "edge"; id: string }
	| { kind: "pane" };

function SelectionBridge({
	onSelectNode,
}: {
	onSelectNode?: (nodeId: string | null) => void;
}) {
	const onSelectNodeRef = useRef(onSelectNode);
	onSelectNodeRef.current = onSelectNode;

	useOnSelectionChange({
		onChange: useCallback(({ nodes }) => {
			onSelectNodeRef.current?.(nodes[0]?.id ?? null);
		}, []),
	});
	return null;
}

function ViewportBridge({
	onZoomChange,
}: {
	onZoomChange?: (zoom: number) => void;
}) {
	const { getZoom } = useReactFlow();
	const onZoomChangeRef = useRef(onZoomChange);
	onZoomChangeRef.current = onZoomChange;

	// biome-ignore lint/correctness/useExhaustiveDependencies: mount-only initial zoom sync
	useEffect(() => {
		onZoomChangeRef.current?.(getZoom());
	}, []);
	return null;
}

function FitViewOnLoad({
	flowId,
	workspacePath,
	onZoomChange,
}: {
	flowId: string;
	workspacePath: string;
	onZoomChange?: (zoom: number) => void;
}) {
	const { fitView, getViewport, setViewport } = useReactFlow();
	const nodesInitialized = useNodesInitialized();
	const appliedFlowRef = useRef<string | null>(null);

	useEffect(() => {
		if (!nodesInitialized) return;
		const applyKey = `${workspacePath}:${flowId}`;
		if (appliedFlowRef.current === applyKey) return;
		appliedFlowRef.current = applyKey;

		let cancelled = false;
		let outerFrame = 0;
		let innerFrame = 0;

		const saved = readCanvasViewport(workspacePath, flowId);
		// Double rAF: wait until the pane has a real size so fitView doesn't
		// pin the graph to the top of an undersized container.
		outerFrame = requestAnimationFrame(() => {
			innerFrame = requestAnimationFrame(() => {
				if (cancelled) return;
				if (saved) {
					void setViewport(saved, { duration: 0 });
					if (cancelled) return;
					onZoomChange?.(getViewport().zoom);
					return;
				}
				void fitView({ padding: 0.2, maxZoom: 1, duration: 0 });
				if (cancelled) return;
				const viewport = getViewport();
				writeCanvasViewport(workspacePath, flowId, viewport);
				onZoomChange?.(viewport.zoom);
			});
		});

		return () => {
			cancelled = true;
			cancelAnimationFrame(outerFrame);
			cancelAnimationFrame(innerFrame);
		};
	}, [
		flowId,
		workspacePath,
		nodesInitialized,
		fitView,
		getViewport,
		setViewport,
		onZoomChange,
	]);

	return null;
}

function resolveContextTarget(event: React.MouseEvent): ContextTarget {
	const el = event.target as HTMLElement | null;
	const nodeEl = el?.closest?.(".react-flow__node") as HTMLElement | null;
	if (nodeEl?.dataset.id) {
		return { kind: "node", id: nodeEl.dataset.id };
	}
	const edgeEl = el?.closest?.(".react-flow__edge") as HTMLElement | null;
	if (edgeEl?.dataset.id) {
		return { kind: "edge", id: edgeEl.dataset.id };
	}
	return { kind: "pane" };
}

function FlowCanvasInner({
	flow,
	workspacePath,
	onGraphChange,
	onSelectNode,
	onZoomChange,
	onDeleteNodes,
	onDeleteEdges,
	onDuplicateNode,
	onAddNode,
	onDropRequest,
	onSave,
	canSave,
}: {
	flow: FlowV1;
	workspacePath: string;
	onGraphChange?: (nodes: Node[], edges: Edge[]) => void;
	onSelectNode?: (nodeId: string | null) => void;
	onZoomChange?: (zoom: number) => void;
	onDeleteNodes?: (nodeIds: string[]) => void;
	onDeleteEdges?: (edgeIds: string[]) => void;
	onDuplicateNode?: (nodeId: string) => void;
	onAddNode?: (
		type: BuiltinNodeType,
		position: { x: number; y: number },
	) => void;
	onDropRequest?: (
		requestPath: string,
		position: { x: number; y: number },
	) => void;
	onSave?: () => void;
	canSave?: boolean;
}) {
	const { zoomIn, zoomOut, getZoom, screenToFlowPosition } = useReactFlow();
	const [nodes, setNodes] = useState<Node[]>(() => flowToReactFlow(flow).nodes);
	const [edges, setEdges] = useState<Edge[]>(() => flowToReactFlow(flow).edges);
	const [contextTarget, setContextTarget] = useState<ContextTarget>({
		kind: "pane",
	});
	const nodesRef = useRef(nodes);
	const edgesRef = useRef(edges);
	nodesRef.current = nodes;
	edgesRef.current = edges;

	const flowIdRef = useRef(flow.id);
	const lastEmittedJsonRef = useRef<string | null>(null);

	useEffect(() => {
		if (flow.id !== flowIdRef.current) {
			flowIdRef.current = flow.id;
			lastEmittedJsonRef.current = null;
			const mapped = flowToReactFlow(flow);
			setNodes(mapped.nodes);
			setEdges(mapped.edges);
			return;
		}

		const flowJson = JSON.stringify(flow);
		if (flowJson === lastEmittedJsonRef.current) return;

		const mapped = flowToReactFlow(flow);
		setNodes((current) =>
			mapped.nodes.map((mn) => {
				const existing = current.find((n) => n.id === mn.id);
				if (!existing) return mn;
				return {
					...mn,
					position: existing.position,
					selected: existing.selected,
					dragging: existing.dragging,
				};
			}),
		);
		setEdges(mapped.edges);
	}, [flow]);

	const emitGraphChange = useCallback(
		(nextNodes: Node[], nextEdges: Edge[]) => {
			const nextFlow = reactFlowToFlow(flow, nextNodes, nextEdges);
			lastEmittedJsonRef.current = JSON.stringify(nextFlow);
			onGraphChange?.(nextNodes, nextEdges);
		},
		[flow, onGraphChange],
	);

	const handleNodesChange = useCallback(
		(changes: NodeChange[]) => {
			const graphEdit = changes.some(
				(change) => change.type !== "select" && change.type !== "dimensions",
			);
			setNodes((current) => {
				const next = applyNodeChanges(changes, current);
				if (graphEdit) {
					emitGraphChange(next, edgesRef.current);
				}
				return next;
			});
		},
		[emitGraphChange],
	);

	const handleEdgesChange = useCallback(
		(changes: EdgeChange[]) => {
			const graphEdit = changes.some((change) => change.type !== "select");
			setEdges((current) => {
				const next = applyEdgeChanges(changes, current);
				if (graphEdit) {
					emitGraphChange(nodesRef.current, next);
				}
				return next;
			});
		},
		[emitGraphChange],
	);

	const onConnect = useCallback(
		(connection: Connection) => {
			if (!connection.source || !connection.target) return;
			const sourceNode = nodesRef.current.find(
				(n) => n.id === connection.source,
			);
			const targetNode = nodesRef.current.find(
				(n) => n.id === connection.target,
			);
			if (targetNode?.type === "start") return;
			if (
				sourceNode?.type === "start" &&
				edgesRef.current.some((e) => e.source === connection.source)
			) {
				return;
			}
			setEdges((current) => {
				const next = addEdge(
					{
						...connection,
						id: `e-${connection.source}-${connection.target}-${crypto.randomUUID().slice(0, 6)}`,
					},
					current,
				);
				emitGraphChange(nodesRef.current, next);
				return next;
			});
		},
		[emitGraphChange],
	);

	const isValidConnection = useCallback((connection: Connection | Edge) => {
		if (!connection.source || !connection.target) return false;
		const sourceNode = nodesRef.current.find((n) => n.id === connection.source);
		const targetNode = nodesRef.current.find((n) => n.id === connection.target);
		if (targetNode?.type === "start") return false;
		if (sourceNode?.type === "start") {
			return !edgesRef.current.some((e) => e.source === connection.source);
		}
		return true;
	}, []);

	useEffect(() => {
		(
			window as unknown as {
				__questerZoom?: { in: () => void; out: () => void; get: () => number };
			}
		).__questerZoom = {
			in: () => zoomIn(),
			out: () => zoomOut(),
			get: () => getZoom(),
		};
	}, [zoomIn, zoomOut, getZoom]);

	const onDragOver = useCallback((event: React.DragEvent) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = "copy";
	}, []);

	const onDrop = useCallback(
		(event: React.DragEvent) => {
			event.preventDefault();
			const position = screenToFlowPosition({
				x: event.clientX,
				y: event.clientY,
			});
			const nodeType = readNodeDragData(event.dataTransfer);
			if (nodeType) {
				onAddNode?.(nodeType, position);
				return;
			}
			const requestPath = readRequestDragData(event.dataTransfer);
			if (requestPath) {
				onDropRequest?.(requestPath, position);
			}
		},
		[onAddNode, onDropRequest, screenToFlowPosition],
	);

	return (
		<ContextMenu>
			<ContextMenuTrigger
				className="block h-full w-full"
				onContextMenu={(event) => {
					setContextTarget(resolveContextTarget(event));
				}}
			>
				<ReactFlow
					nodes={nodes}
					edges={edges}
					nodeTypes={flowNodeTypes}
					onNodesChange={handleNodesChange}
					onEdgesChange={handleEdgesChange}
					onConnect={onConnect}
					isValidConnection={isValidConnection}
					onDragOver={onDragOver}
					onDrop={onDrop}
					onMoveEnd={(_, viewport) => {
						writeCanvasViewport(workspacePath, flow.id, viewport);
						onZoomChange?.(viewport.zoom);
					}}
					nodesDraggable
					nodesConnectable
					elementsSelectable
					proOptions={{ hideAttribution: true }}
					className="bg-muted/50"
					minZoom={CANVAS_MIN_ZOOM}
					maxZoom={CANVAS_MAX_ZOOM}
				>
					<Background
						variant={BackgroundVariant.Dots}
						gap={18}
						size={1.5}
						color="color-mix(in oklch, var(--foreground) 22%, transparent)"
					/>
					<FitViewOnLoad
						flowId={flow.id}
						workspacePath={workspacePath}
						onZoomChange={onZoomChange}
					/>
					<SelectionBridge onSelectNode={onSelectNode} />
					<ViewportBridge onZoomChange={onZoomChange} />
				</ReactFlow>
			</ContextMenuTrigger>
			<ContextMenuContent>
				{contextTarget.kind === "node" ? (
					<>
						<ContextMenuItem
							onClick={() => onDuplicateNode?.(contextTarget.id)}
						>
							Duplicate
						</ContextMenuItem>
						<ContextMenuItem
							variant="destructive"
							onClick={() => onDeleteNodes?.([contextTarget.id])}
						>
							Delete
						</ContextMenuItem>
					</>
				) : null}
				{contextTarget.kind === "edge" ? (
					<ContextMenuItem
						variant="destructive"
						onClick={() => onDeleteEdges?.([contextTarget.id])}
					>
						Delete edge
					</ContextMenuItem>
				) : null}
				{contextTarget.kind === "pane" ? (
					<ContextMenuItem disabled={!canSave} onClick={() => onSave?.()}>
						Save flow
						<ContextMenuShortcut>
							{typeof navigator !== "undefined" &&
							/Mac|iPhone|iPad/.test(navigator.platform)
								? "⌘S"
								: "Ctrl+S"}
						</ContextMenuShortcut>
					</ContextMenuItem>
				) : null}
			</ContextMenuContent>
		</ContextMenu>
	);
}

export function FlowCanvas({
	flow,
	workspacePath = "",
	onGraphChange,
	onSelectNode,
	onZoomChange,
	onDeleteNodes,
	onDeleteEdges,
	onDuplicateNode,
	onAddNode,
	onDropRequest,
	onSave,
	canSave,
}: FlowCanvasProps) {
	if (!flow) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
				Select a flow to open the canvas
			</div>
		);
	}

	return (
		<ReactFlowProvider>
			<div className="h-full w-full">
				<FlowCanvasInner
					key={`${workspacePath}:${flow.id}`}
					flow={flow}
					workspacePath={workspacePath}
					onGraphChange={onGraphChange}
					onSelectNode={onSelectNode}
					onZoomChange={onZoomChange}
					onDeleteNodes={onDeleteNodes}
					onDeleteEdges={onDeleteEdges}
					onDuplicateNode={onDuplicateNode}
					onAddNode={onAddNode}
					onDropRequest={onDropRequest}
					onSave={onSave}
					canSave={canSave}
				/>
			</div>
		</ReactFlowProvider>
	);
}

export function callQuesterZoom(action: "in" | "out"): number {
	const api = (
		window as unknown as {
			__questerZoom?: { in: () => void; out: () => void; get: () => number };
		}
	).__questerZoom;
	if (!api) return 1;
	if (action === "in") api.in();
	else api.out();
	return api.get();
}
