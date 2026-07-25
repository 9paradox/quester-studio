import {
	type PathShapeIndex,
	collectJsonPaths,
	collectionSourceKey,
	mergePathShapes,
	nodeSourceKey,
} from "./pathShapes.js";

/** Index each node output from a flow run into the path-shape catalog. */
export function indexNodeOutputs(
	index: PathShapeIndex,
	nodeOutputs: Record<string, unknown> | undefined | null,
	now = Date.now(),
): PathShapeIndex {
	if (!nodeOutputs) return index;
	let next = index;
	for (const [nodeId, output] of Object.entries(nodeOutputs)) {
		const paths = collectJsonPaths(output);
		if (paths.length === 0) continue;
		next = mergePathShapes(next, nodeSourceKey(nodeId), paths, now);
	}
	return next;
}

/** Index an HTTP-like collection response (status, headers, body, …). */
export function indexCollectionResponse(
	index: PathShapeIndex,
	requestPath: string,
	httpOutput: unknown,
	now = Date.now(),
): PathShapeIndex {
	const paths = collectJsonPaths(httpOutput);
	if (paths.length === 0) return index;
	return mergePathShapes(index, collectionSourceKey(requestPath), paths, now);
}
