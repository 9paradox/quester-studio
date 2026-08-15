import { useLayoutEffect, useRef } from "react";
import { useStoreApi } from "reactflow";

/**
 * Measure the visible card (not a stale wrapper box) so RF's multi-select
 * rect covers the full node.
 */
export function useSyncNodeMeasuredSize(nodeId: string) {
	const ref = useRef<HTMLDivElement>(null);
	const store = useStoreApi();

	useLayoutEffect(() => {
		const card = ref.current;
		if (!card) return;

		const sync = () => {
			store
				.getState()
				.updateNodeDimensions([
					{ id: nodeId, nodeElement: card, forceUpdate: true },
				]);
		};

		sync();
		const observer = new ResizeObserver(() => sync());
		observer.observe(card);
		return () => observer.disconnect();
	}, [nodeId, store]);

	return ref;
}
