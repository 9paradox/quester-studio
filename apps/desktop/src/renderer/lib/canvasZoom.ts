/** Canvas zoom bridge set by FlowCanvas on window.__questerZoom. */

type QuesterZoomApi = {
	in: () => void;
	out: () => void;
	fit: () => void;
	get: () => number;
};

function getZoomApi(): QuesterZoomApi | undefined {
	if (typeof window === "undefined") return undefined;
	return (window as unknown as { __questerZoom?: QuesterZoomApi })
		.__questerZoom;
}

export function callQuesterZoom(action: "in" | "out" | "fit"): number {
	const api = getZoomApi();
	if (!api) return 1;
	if (action === "in") api.in();
	else if (action === "out") api.out();
	else api.fit();
	return api.get();
}
