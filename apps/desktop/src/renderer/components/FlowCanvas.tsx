import { Button } from "@/components/ui/button.js";
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
import {
	readCodeDragData,
	readFlowDragData,
	readFormDragData,
	readNodeDragData,
	readRequestDragData,
} from "@/lib/dnd.js";
import {
	type AlignNodesMode,
	EDGE_INTERACTION_WIDTH,
	findFrameAtPoint,
	flowToReactFlow,
	isFrameContainerType,
	isValidFlowConnection,
	pruneRedundantFrameWiring,
	reactFlowToFlow,
	reparentNodeInFlow,
} from "@/lib/flowEditor.js";
import { isTypingFocus } from "@/lib/typingFocus.js";
import { useQuesterStore } from "@/stores/quester-store.js";
import type { BuiltinNodeType, FlowV1 } from "@quester-studio/schema";
import { IconFocusCentered, IconMinus, IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Background,
	BackgroundVariant,
	type Connection,
	type Edge,
	type EdgeChange,
	type Node,
	type NodeChange,
	Panel,
	ReactFlow,
	ReactFlowProvider,
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
	reconnectEdge,
	useNodesInitialized,
	useOnSelectionChange,
	useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { toast } from "sonner";
import { flowNodeTypes } from "./nodes/FlowNodes.js";

type FlowCanvasProps = {
	flow: FlowV1 | null;
	workspacePath?: string;
	onGraphChange?: (nodes: Node[], edges: Edge[]) => void;
	onSelectNodes?: (nodeIds: string[]) => void;
	onZoomChange?: (zoom: number) => void;
	onDeleteNodes?: (nodeIds: string[]) => void;
	onDeleteEdges?: (edgeIds: string[]) => void;
	onDuplicateNode?: (nodeId: string) => void;
	onAlignNodes?: (mode: AlignNodesMode) => void;
	onDistributeNodes?: (axis: "horizontal" | "vertical") => void;
	onAddNode?: (
		type: BuiltinNodeType,
		position: { x: number; y: number },
	) => void;
	onDropRequest?: (
		requestPath: string,
		position: { x: number; y: number },
	) => void;
	onDropFlow?: (flowId: string, position: { x: number; y: number }) => void;
	onSave?: () => void;
	canSave?: boolean;
};

type ContextTarget =
	| { kind: "node"; id: string }
	| { kind: "edge"; id: string }
	| { kind: "pane" };

function SelectionBridge({
	onSelectNodes,
}: {
	onSelectNodes?: (nodeIds: string[]) => void;
}) {
	const onSelectNodesRef = useRef(onSelectNodes);
	onSelectNodesRef.current = onSelectNodes;

	useOnSelectionChange({
		onChange: useCallback(({ nodes }) => {
			onSelectNodesRef.current?.(nodes.map((n) => n.id));
		}, []),
	});
	return null;
}

/** Pan/zoom to a node requested from the Response timeline (stay on summary). */
function CanvasFocusBridge() {
	const request = useQuesterStore((s) => s.canvasFocusRequest);
	const clearCanvasFocusRequest = useQuesterStore(
		(s) => s.clearCanvasFocusRequest,
	);
	const { fitView, setNodes } = useReactFlow();
	const nodesInitialized = useNodesInitialized();

	useEffect(() => {
		if (!request || !nodesInitialized) return;
		const { nodeId } = request;
		setNodes((current) =>
			current.map((n) => ({
				...n,
				selected: n.id === nodeId,
			})),
		);
		void fitView({
			nodes: [{ id: nodeId }],
			padding: 0.35,
			duration: 280,
			maxZoom: 1.25,
		});
		clearCanvasFocusRequest();
	}, [request, nodesInitialized, fitView, setNodes, clearCanvasFocusRequest]);

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
	const el = event.target as Element | null;
	const nodeEl = el?.closest?.(".react-flow__node") as HTMLElement | null;
	if (nodeEl?.dataset.id) {
		return { kind: "node", id: nodeEl.dataset.id };
	}
	const edgeEl = el?.closest?.(
		".react-flow__edge, .react-flow__edge-path, .react-flow__edge-interaction",
	) as HTMLElement | null;
	const edgeRoot = edgeEl?.closest?.(".react-flow__edge") as HTMLElement | null;
	const edgeId =
		edgeRoot?.dataset.id ??
		edgeEl?.dataset.id ??
		edgeRoot?.getAttribute("data-testid")?.replace(/^rf__edge-/, "");
	if (edgeId) {
		return { kind: "edge", id: edgeId };
	}
	return { kind: "pane" };
}

function FlowCanvasInner({
	flow,
	workspacePath,
	onGraphChange,
	onSelectNodes,
	onZoomChange,
	onDeleteNodes,
	onDeleteEdges,
	onDuplicateNode,
	onAlignNodes,
	onDistributeNodes,
	onAddNode,
	onDropRequest,
	onDropFlow,
	onSave,
	canSave,
}: {
	flow: FlowV1;
	workspacePath: string;
	onGraphChange?: (nodes: Node[], edges: Edge[]) => void;
	onSelectNodes?: (nodeIds: string[]) => void;
	onZoomChange?: (zoom: number) => void;
	onDeleteNodes?: (nodeIds: string[]) => void;
	onDeleteEdges?: (edgeIds: string[]) => void;
	onDuplicateNode?: (nodeId: string) => void;
	onAlignNodes?: (mode: AlignNodesMode) => void;
	onDistributeNodes?: (axis: "horizontal" | "vertical") => void;
	onAddNode?: (
		type: BuiltinNodeType,
		position: { x: number; y: number },
	) => void;
	onDropRequest?: (
		requestPath: string,
		position: { x: number; y: number },
	) => void;
	onDropFlow?: (flowId: string, position: { x: number; y: number }) => void;
	onSave?: () => void;
	canSave?: boolean;
}) {
	const { zoomIn, zoomOut, fitView, getZoom, screenToFlowPosition } =
		useReactFlow();
	const [typingInUi, setTypingInUi] = useState(() =>
		isTypingFocus(document.activeElement),
	);

	useEffect(() => {
		const sync = () => setTypingInUi(isTypingFocus(document.activeElement));
		document.addEventListener("focusin", sync);
		document.addEventListener("focusout", sync);
		return () => {
			document.removeEventListener("focusin", sync);
			document.removeEventListener("focusout", sync);
		};
	}, []);
	const [nodes, setNodes] = useState<Node[]>(() => flowToReactFlow(flow).nodes);
	const [edges, setEdges] = useState<Edge[]>(() => flowToReactFlow(flow).edges);
	const [contextTarget, setContextTarget] = useState<ContextTarget>({
		kind: "pane",
	});
	const nodesRef = useRef(nodes);
	const edgesRef = useRef(edges);
	const flowRef = useRef(flow);
	const reconnectingEdgeIdRef = useRef<string | null>(null);
	nodesRef.current = nodes;
	edgesRef.current = edges;
	flowRef.current = flow;

	const flowIdRef = useRef(flow.id);
	const lastEmittedJsonRef = useRef<string | null>(null);
	/** Node ids currently being resized by NodeResizer (ignore RF's post-layout measure events). */
	const userResizingIdsRef = useRef(new Set<string>());

	useEffect(() => {
		if (flow.id !== flowIdRef.current) {
			flowIdRef.current = flow.id;
			lastEmittedJsonRef.current = JSON.stringify(flow);
			const mapped = flowToReactFlow(flow);
			setNodes(mapped.nodes);
			setEdges(mapped.edges);
			return;
		}

		const flowJson = JSON.stringify(flow);
		if (flowJson === lastEmittedJsonRef.current) return;
		lastEmittedJsonRef.current = flowJson;

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
		setEdges((current) =>
			mapped.edges.map((me) => {
				const existing = current.find((e) => e.id === me.id);
				if (!existing) return me;
				return {
					...me,
					selected: existing.selected,
				};
			}),
		);
	}, [flow]);

	const emitGraphChange = useCallback(
		(nextNodes: Node[], nextEdges: Edge[]) => {
			const nextFlow = reactFlowToFlow(flowRef.current, nextNodes, nextEdges);
			const json = JSON.stringify(nextFlow);
			// Skip no-op emits (e.g. RF dimension noise after connect/layout).
			if (json === lastEmittedJsonRef.current) return;
			lastEmittedJsonRef.current = json;
			onGraphChange?.(nextNodes, nextEdges);
		},
		[onGraphChange],
	);

	const handleNodesChange = useCallback(
		(changes: NodeChange[]) => {
			for (const change of changes) {
				if (change.type !== "dimensions") continue;
				if (change.resizing === true) {
					userResizingIdsRef.current.add(change.id);
				}
			}
			const userResizeEnded = changes.some(
				(change) =>
					change.type === "dimensions" &&
					change.resizing === false &&
					userResizingIdsRef.current.has(change.id),
			);
			for (const change of changes) {
				if (change.type === "dimensions" && change.resizing === false) {
					userResizingIdsRef.current.delete(change.id);
				}
			}
			const graphEdit =
				userResizeEnded ||
				changes.some(
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
			if (
				!isValidFlowConnection({
					source: connection.source,
					target: connection.target,
					sourceHandle: connection.sourceHandle,
					targetHandle: connection.targetHandle,
					nodes: nodesRef.current,
					edges: edgesRef.current,
				})
			) {
				return;
			}
			setEdges((current) => {
				const src = nodesRef.current.find((n) => n.id === connection.source);
				const tgt = nodesRef.current.find((n) => n.id === connection.target);
				const replacingNestedExit = Boolean(
					connection.source &&
						connection.target &&
						src &&
						tgt &&
						isFrameContainerType(src.type) &&
						isFrameContainerType(tgt.type) &&
						src.parentId === tgt.id &&
						(connection.targetHandle === "exit" ||
							connection.targetHandle == null ||
							connection.targetHandle === ""),
				);
				const base = replacingNestedExit
					? current.filter(
							(e) =>
								!(
									e.source === connection.source &&
									e.target === connection.target &&
									(e.targetHandle === "exit" ||
										e.targetHandle == null ||
										e.targetHandle === "")
								),
						)
					: current;
				const inFrame = Boolean(
					src?.parentId ||
						tgt?.parentId ||
						isFrameContainerType(src?.type) ||
						isFrameContainerType(tgt?.type),
				);
				let next = addEdge(
					{
						...connection,
						id: `e-${connection.source}-${connection.target}-${crypto.randomUUID().slice(0, 6)}`,
						interactionWidth: EDGE_INTERACTION_WIDTH,
						reconnectable: true,
						...(inFrame ? { zIndex: 1002 } : {}),
					},
					base,
				);
				if (connection.source && connection.target) {
					const provisional = reactFlowToFlow(
						flowRef.current,
						nodesRef.current,
						next,
					);
					const pruned = pruneRedundantFrameWiring(
						provisional,
						connection.source,
						connection.target,
					);
					if (pruned !== provisional) {
						next = flowToReactFlow(pruned).edges;
					}
				}
				emitGraphChange(nodesRef.current, next);
				return next;
			});
		},
		[emitGraphChange],
	);

	const onReconnect = useCallback(
		(oldEdge: Edge, newConnection: Connection) => {
			if (
				!isValidFlowConnection({
					source: newConnection.source,
					target: newConnection.target,
					sourceHandle: newConnection.sourceHandle,
					targetHandle: newConnection.targetHandle,
					nodes: nodesRef.current,
					edges: edgesRef.current,
					ignoreEdgeId: oldEdge.id,
				})
			) {
				return;
			}
			setEdges((current) => {
				const next = reconnectEdge(oldEdge, newConnection, current, {
					shouldReplaceId: false,
				}).map((e) =>
					e.id === oldEdge.id
						? {
								...e,
								interactionWidth: EDGE_INTERACTION_WIDTH,
								reconnectable: true,
							}
						: e,
				);
				emitGraphChange(nodesRef.current, next);
				return next;
			});
		},
		[emitGraphChange],
	);

	const onReconnectStart = useCallback((_: React.MouseEvent, edge: Edge) => {
		reconnectingEdgeIdRef.current = edge.id;
	}, []);

	const onReconnectEnd = useCallback(() => {
		reconnectingEdgeIdRef.current = null;
	}, []);

	const isValidConnection = useCallback((connection: Connection | Edge) => {
		return isValidFlowConnection({
			source: connection.source,
			target: connection.target,
			sourceHandle: connection.sourceHandle,
			targetHandle: connection.targetHandle,
			nodes: nodesRef.current,
			edges: edgesRef.current,
			ignoreEdgeId: reconnectingEdgeIdRef.current,
		});
	}, []);

	const absoluteNodePosition = useCallback(
		(node: Node): { x: number; y: number } => {
			let x = node.position.x;
			let y = node.position.y;
			let parentId = node.parentId;
			const nodes = nodesRef.current;
			while (parentId) {
				const parent = nodes.find((n) => n.id === parentId);
				if (!parent) break;
				x += parent.position.x;
				y += parent.position.y;
				parentId = parent.parentId;
			}
			return { x, y };
		},
		[],
	);

	const onNodeDragStop = useCallback(
		(_: React.MouseEvent, node: Node) => {
			if (!flow) return;
			if (node.type === "start") return;
			const abs = absoluteNodePosition(node);
			const w = typeof node.width === "number" ? node.width : 120;
			const h = typeof node.height === "number" ? node.height : 48;
			const hit = { x: abs.x + w / 2, y: abs.y + h / 2 };
			const frameId = findFrameAtPoint(flow, hit, node.id);
			const currentParent = node.parentId ?? null;
			if (frameId === currentParent) return;
			const nextFlow = reparentNodeInFlow(flow, node.id, frameId, abs);
			const mapped = flowToReactFlow(nextFlow);
			// Preserve selection
			const withSelection = mapped.nodes.map((n) => ({
				...n,
				selected: n.id === node.id,
			}));
			setNodes(withSelection);
			setEdges(mapped.edges);
			emitGraphChange(withSelection, mapped.edges);
		},
		[absoluteNodePosition, emitGraphChange, flow],
	);

	useEffect(() => {
		(
			window as unknown as {
				__questerZoom?: {
					in: () => void;
					out: () => void;
					fit: () => void;
					get: () => number;
				};
			}
		).__questerZoom = {
			in: () => zoomIn(),
			out: () => zoomOut(),
			fit: () => {
				void fitView({ padding: 0.15, duration: 200 });
			},
			get: () => getZoom(),
		};
	}, [zoomIn, zoomOut, fitView, getZoom]);

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
				return;
			}
			const droppedFlowId = readFlowDragData(event.dataTransfer);
			if (droppedFlowId) {
				onDropFlow?.(droppedFlowId, position);
				return;
			}
			if (readFormDragData(event.dataTransfer)) {
				toast.info("Forms coming soon");
				return;
			}
			if (readCodeDragData(event.dataTransfer)) {
				toast.info("Code node coming soon");
			}
		},
		[onAddNode, onDropFlow, onDropRequest, screenToFlowPosition],
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
					onReconnect={onReconnect}
					onReconnectStart={onReconnectStart}
					onReconnectEnd={onReconnectEnd}
					isValidConnection={isValidConnection}
					onNodeDragStop={onNodeDragStop}
					onEdgeContextMenu={(_, edge) => {
						setContextTarget({ kind: "edge", id: edge.id });
					}}
					onNodeContextMenu={(_, node) => {
						setContextTarget({ kind: "node", id: node.id });
					}}
					onPaneContextMenu={() => {
						setContextTarget({ kind: "pane" });
					}}
					onDragOver={onDragOver}
					onDrop={onDrop}
					onMoveEnd={(_, viewport) => {
						writeCanvasViewport(workspacePath, flow.id, viewport);
						onZoomChange?.(viewport.zoom);
					}}
					nodesDraggable
					nodesConnectable
					elementsSelectable
					edgesUpdatable
					edgesFocusable
					deleteKeyCode={typingInUi ? null : (["Backspace", "Delete"] as const)}
					defaultEdgeOptions={{
						interactionWidth: EDGE_INTERACTION_WIDTH,
						reconnectable: true,
					}}
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
					<Panel
						position="bottom-right"
						className="m-3 flex flex-col overflow-hidden rounded-md border border-border bg-background/95 p-0 shadow-sm backdrop-blur-sm"
					>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="rounded-none border-b border-border"
							aria-label="Zoom in"
							onClick={() => zoomIn()}
						>
							<IconPlus />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="rounded-none border-b border-border"
							aria-label="Zoom out"
							onClick={() => zoomOut()}
						>
							<IconMinus />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="rounded-none"
							aria-label="Fit view"
							onClick={() => void fitView({ padding: 0.15, duration: 200 })}
						>
							<IconFocusCentered />
						</Button>
					</Panel>
					<FitViewOnLoad
						flowId={flow.id}
						workspacePath={workspacePath}
						onZoomChange={onZoomChange}
					/>
					<SelectionBridge onSelectNodes={onSelectNodes} />
					<CanvasFocusBridge />
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
							onClick={() => {
								const selected = nodes
									.filter((n) => n.selected)
									.map((n) => n.id);
								const ids =
									selected.length > 1 && selected.includes(contextTarget.id)
										? selected
										: [contextTarget.id];
								onDeleteNodes?.(ids);
							}}
						>
							Delete
						</ContextMenuItem>
						{nodes.filter((n) => n.selected).length >= 2 ? (
							<>
								<ContextMenuItem onClick={() => onAlignNodes?.("left")}>
									Align left
								</ContextMenuItem>
								<ContextMenuItem onClick={() => onAlignNodes?.("right")}>
									Align right
								</ContextMenuItem>
								<ContextMenuItem onClick={() => onAlignNodes?.("top")}>
									Align top
								</ContextMenuItem>
								<ContextMenuItem onClick={() => onAlignNodes?.("bottom")}>
									Align bottom
								</ContextMenuItem>
								<ContextMenuItem onClick={() => onAlignNodes?.("centerX")}>
									Align center X
								</ContextMenuItem>
								<ContextMenuItem onClick={() => onAlignNodes?.("centerY")}>
									Align center Y
								</ContextMenuItem>
							</>
						) : null}
						{nodes.filter((n) => n.selected).length >= 3 ? (
							<>
								<ContextMenuItem
									onClick={() => onDistributeNodes?.("horizontal")}
								>
									Distribute horizontally
								</ContextMenuItem>
								<ContextMenuItem
									onClick={() => onDistributeNodes?.("vertical")}
								>
									Distribute vertically
								</ContextMenuItem>
							</>
						) : null}
					</>
				) : null}
				{contextTarget.kind === "edge" ? (
					<ContextMenuItem
						variant="destructive"
						onClick={() => onDeleteEdges?.([contextTarget.id])}
					>
						Delete edge
						<ContextMenuShortcut>Del</ContextMenuShortcut>
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
	onSelectNodes,
	onZoomChange,
	onDeleteNodes,
	onDeleteEdges,
	onDuplicateNode,
	onAlignNodes,
	onDistributeNodes,
	onAddNode,
	onDropRequest,
	onDropFlow,
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
					onSelectNodes={onSelectNodes}
					onZoomChange={onZoomChange}
					onDeleteNodes={onDeleteNodes}
					onDeleteEdges={onDeleteEdges}
					onDuplicateNode={onDuplicateNode}
					onAlignNodes={onAlignNodes}
					onDistributeNodes={onDistributeNodes}
					onAddNode={onAddNode}
					onDropRequest={onDropRequest}
					onDropFlow={onDropFlow}
					onSave={onSave}
					canSave={canSave}
				/>
			</div>
		</ReactFlowProvider>
	);
}

/** @deprecated Prefer `@/lib/canvasZoom.js` — kept for any direct imports. */
export { callQuesterZoom } from "@/lib/canvasZoom.js";
