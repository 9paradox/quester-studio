/** Canvas zoom bridge set by FlowCanvas on window.__questerZoom. */

type QuesterZoomApi = {
	in: () => Promise<unknown>;
	out: () => Promise<unknown>;
	fit: () => Promise<unknown>;
	get: () => number;
};

function getZoomApi(): QuesterZoomApi | undefined {
	if (typeof window === "undefined") return undefined;
	return (window as unknown as { __questerZoom?: QuesterZoomApi })
		.__questerZoom;
}

export async function callQuesterZoom(
	action: "in" | "out" | "fit",
): Promise<number> {
	const api = getZoomApi();
	if (!api) return 1;
	if (action === "in") await api.in();
	else if (action === "out") await api.out();
	else await api.fit();
	return api.get();
}
