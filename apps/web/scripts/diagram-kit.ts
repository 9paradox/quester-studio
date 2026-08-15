/** Header band with rounded top corners only (desktop frame header). */
function frameHeaderPath(
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
): string {
	const right = x + w;
	const bottom = y + h;
	return `M ${x + r} ${y} H ${right - r} Q ${right} ${y} ${right} ${y + r} V ${bottom} H ${x} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
}

/** Shared SVG marker defs — include once per diagram via DiagramDefs snippet. */
export const DIAGRAM_DEFS = `
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
`.trim();

/** Matches `FRAME_INNER_INSET_PX` in desktop FlowNodes. */
const FRAME_INSET = 14;
/** Desktop default rem → px (`FlowNodes.tsx` handle `top` offsets). */
const DESKTOP_REM_PX = 16;
const PORT_R = 6;

/** Outer header port — full circle outside the frame border. */
function outerPortDot(cx: number, cy: number): string {
	return `  <circle class="qs-port" cx="${cx}" cy="${cy}" r="${PORT_R}"/>`;
}

/** Inner body port — semicircle on the inner border, opening into the body. */
function innerPortArc(side: "entry" | "exit", x: number, y: number): string {
	const r = PORT_R;
	if (side === "entry") {
		return `  <path class="qs-port" d="M ${x} ${y - r} A ${r} ${r} 0 0 1 ${x} ${y + r} L ${x} ${y - r} Z"/>`;
	}
	return `  <path class="qs-port" d="M ${x} ${y - r} A ${r} ${r} 0 0 0 ${x} ${y + r} L ${x} ${y - r} Z"/>`;
}

function svgText(
	x: number,
	y: number,
	text: string,
	cls: string,
	anchor: "start" | "middle" | "end" = "start",
	baseline: "middle" | "hanging" | "auto" = "middle",
): string {
	return `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="${baseline}">${text}</text>`;
}

/** Caption below an outer header port (matches standard portSvg: in ×1 / out ×1). */
function outerPortLabel(cx: number, cy: number, label: string): string {
	return svgText(cx, cy + 30, `${label} ×1`, "qs-caption", "middle");
}

/** Inner body port caption — above the wire. */
function innerPortLabel(
	x: number,
	portY: number,
	text: string,
	anchor: "start" | "end",
): string {
	return svgText(x, portY - 12, text, "qs-caption", anchor, "auto");
}

export type PortKind =
	| "none"
	| "one"
	| "branch2"
	| "branchN"
	| "multiIn"
	| "frameOuter"
	| "sourceOnly"
	| "targetOnly"
	| "formPause";

export const NODE_PORTS: Record<
	string,
	{ in: string; out: string; kind: PortKind; blurb: string }
> = {
	start: {
		in: "0 (no target handle)",
		out: "1 (at most one edge)",
		kind: "sourceOnly",
		blurb: "Sole entry. Exactly one start per flow.",
	},
	note: {
		in: "0",
		out: "0",
		kind: "none",
		blurb: "Canvas sticky. Edges to/from note are invalid.",
	},
	input: {
		in: "1",
		out: "1",
		kind: "one",
		blurb: "Puts run payload on the wire.",
	},
	form: {
		in: "1",
		out: "1",
		kind: "formPause",
		blurb:
			"Pauses until submit (desktop UI or CLI --forms). Output is the submitted field object.",
	},
	http: {
		in: "1",
		out: "1 (fan-out ok)",
		kind: "one",
		blurb: "Wire in unused unless templated into the request.",
	},
	extract: {
		in: "1",
		out: "1",
		kind: "one",
		blurb: "JMESPath over wire JSON (body.id, products[0]).",
	},
	template: { in: "1", out: "1", kind: "one", blurb: "Renders a string." },
	set: {
		in: "1",
		out: "1",
		kind: "one",
		blurb: "Writes vars; passes wire through.",
	},
	if: {
		in: "1",
		out: "true · false",
		kind: "branch2",
		blurb: "Follows matching sourceHandle.",
	},
	switch: {
		in: "1",
		out: "cases… + default",
		kind: "branchN",
		blurb: "One handle per case plus default.",
	},
	delay: { in: "1", out: "1", kind: "one", blurb: "Sleep, then passthrough." },
	foreach: {
		in: "1 (header left)",
		out: "complete (header right)",
		kind: "frameOuter",
		blurb:
			"Framed loop container — outer ports on the header; entry/exit on the inner body border.",
	},
	try: {
		in: "1 (header left)",
		out: "success · failed (header right)",
		kind: "frameOuter",
		blurb:
			"Framed exception boundary — outer ports on the header; entry/exit on the inner body border.",
	},
	subflow: { in: "1", out: "1", kind: "one", blurb: "Calls another flow." },
	output: {
		in: "1",
		out: "0 (no source handle)",
		kind: "targetOnly",
		blurb: "Flow result. Terminal for the chosen path.",
	},
	assert: {
		in: "1",
		out: "1",
		kind: "one",
		blurb: "JMESPath checks or throw.",
	},
	transform: {
		in: "1",
		out: "1",
		kind: "one",
		blurb: "Build object via JMESPath map.",
	},
	merge: { in: "1", out: "1", kind: "one", blurb: "Deep-merge named sources." },
	join: {
		in: "N",
		out: "1 · fan-out ok",
		kind: "multiIn",
		blurb:
			"Barrier — waits for every live predecessor, emits collect-map by node id.",
	},
	json: {
		in: "1",
		out: "1",
		kind: "one",
		blurb: "Passthrough or JMESPath subset.",
	},
	log: { in: "1", out: "1", kind: "one", blurb: "Log line; wire continues." },
	inspect: {
		in: "1",
		out: "1",
		kind: "one",
		blurb: "Debug view; alias preview.",
	},
};

/** Linear / branch port sketch for per-node reference pages. */
export function portSvg(type: string, title = type): string {
	const meta = NODE_PORTS[type] ?? {
		in: "1",
		out: "1",
		kind: "one" as PortKind,
		blurb: "",
	};
	const kind = meta.kind;

	if (kind === "none") {
		return `<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 420 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title} has no ports">
${DIAGRAM_DEFS}
  <rect class="qs-node qs-node-deny" x="110" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="210" y="75" text-anchor="middle">${title}</text>
  <text class="qs-caption" x="210" y="128" text-anchor="middle">no handles · no edges</text>
</svg>
<figcaption>${meta.blurb}</figcaption>
</figure>`;
	}

	if (kind === "sourceOnly") {
		return `<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 480 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title} ports">
${DIAGRAM_DEFS}
  <text class="qs-caption" x="70" y="36" text-anchor="middle">no in</text>
  <rect class="qs-node qs-node-accent" x="40" y="48" width="160" height="56" rx="8"/>
  <text class="qs-label" x="120" y="82" text-anchor="middle">${title}</text>
  <line class="qs-edge" x1="200" y1="76" x2="300" y2="76"/>
  <circle class="qs-port" cx="306" cy="76" r="6"/>
  <text class="qs-caption" x="360" y="80">out ×1 (max 1 edge)</text>
</svg>
<figcaption>${meta.blurb}</figcaption>
</figure>`;
	}

	if (kind === "targetOnly") {
		return `<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 480 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title} ports">
${DIAGRAM_DEFS}
  <circle class="qs-port" cx="70" cy="76" r="6"/>
  <text class="qs-caption" x="70" y="108" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="76" y1="76" x2="170" y2="76"/>
  <rect class="qs-node qs-node-accent" x="170" y="48" width="160" height="56" rx="8"/>
  <text class="qs-label" x="250" y="82" text-anchor="middle">${title}</text>
  <text class="qs-caption" x="390" y="80">no out</text>
</svg>
<figcaption>${meta.blurb}</figcaption>
</figure>`;
	}

	if (kind === "branch2") {
		const [a, b] = ["true", "false"];
		return `<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 560 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title} branch ports">
${DIAGRAM_DEFS}
  <circle class="qs-port" cx="48" cy="90" r="6"/>
  <text class="qs-caption" x="48" y="120" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="90" x2="140" y2="90"/>
  <rect class="qs-node qs-node-accent" x="140" y="60" width="140" height="60" rx="8"/>
  <text class="qs-label" x="210" y="96" text-anchor="middle">${title}</text>
  <path class="qs-edge qs-edge-ok" d="M280 78 H340 V50 H400"/>
  <circle class="qs-port" cx="406" cy="50" r="6"/>
  <text class="qs-caption" x="460" y="54">${a}</text>
  <path class="qs-edge" d="M280 102 H340 V130 H400"/>
  <circle class="qs-port" cx="406" cy="130" r="6"/>
  <text class="qs-caption" x="460" y="134">${b}</text>
</svg>
<figcaption>${meta.blurb} Connect edges with matching <code>sourceHandle</code>.</figcaption>
</figure>`;
	}

	if (kind === "frameOuter") {
		const isTry = type === "try";
		const outerOuts = isTry
			? [
					{ y: 46, label: "success", cls: "qs-edge-ok" },
					{ y: 72, label: "failed", cls: "" },
				]
			: [{ y: 58, label: "complete", cls: "qs-edge-ok" }];
		const outerPaths = outerOuts
			.map(
				(o) => `
  <circle class="qs-port" cx="418" cy="${o.y}" r="5"/>
  <text class="qs-caption" x="448" y="${o.y + 4}">${o.label}</text>
  <line class="qs-edge ${o.cls}" x1="424" y1="${o.y}" x2="470" y2="${o.y}"/>
  <circle class="qs-port" cx="476" cy="${o.y}" r="5"/>`,
			)
			.join("");
		return `<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 540 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title} outer frame ports">
${DIAGRAM_DEFS}
  <text class="qs-caption" x="270" y="18" text-anchor="middle">Outside wires use header ports only — not body entry/exit</text>
  <line class="qs-edge" x1="36" y1="58" x2="88" y2="58"/>
  <circle class="qs-port" cx="30" cy="58" r="5"/>
  <text class="qs-caption" x="30" y="82" text-anchor="middle">in</text>
  <rect class="qs-node qs-node-accent" x="88" y="36" width="330" height="118" rx="8" fill="color-mix(in oklch, var(--qs-accent) 5%, var(--qs-surface))"/>
  <rect class="qs-node qs-node-accent" x="88" y="36" width="330" height="30" rx="8"/>
  <rect x="88" y="54" width="330" height="12" fill="color-mix(in oklch, var(--qs-accent) 8%, var(--qs-surface))" stroke="none"/>
  <text class="qs-label" x="110" y="56">${title}</text>
  <circle class="qs-port" cx="88" cy="58" r="5"/>${outerPaths}
  <rect class="qs-node" x="104" y="78" width="298" height="60" rx="6" stroke-dasharray="4 3" fill="none"/>
  <text class="qs-caption" x="253" y="112" text-anchor="middle">inner body · entry → … → exit</text>
</svg>
<figcaption>${meta.blurb} See the frame wiring diagram below.</figcaption>
</figure>`;
	}

	if (kind === "branchN") {
		return `<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 580 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title} multi-branch ports">
${DIAGRAM_DEFS}
  <circle class="qs-port" cx="48" cy="100" r="6"/>
  <text class="qs-caption" x="48" y="130" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="100" x2="140" y2="100"/>
  <rect class="qs-node qs-node-accent" x="140" y="70" width="150" height="60" rx="8"/>
  <text class="qs-label" x="215" y="106" text-anchor="middle">${title}</text>
  <path class="qs-edge qs-edge-ok" d="M290 84 H360 V40 H430"/>
  <circle class="qs-port" cx="436" cy="40" r="6"/>
  <text class="qs-caption" x="500" y="44">case…</text>
  <path class="qs-edge" d="M290 100 H360"/>
  <circle class="qs-port" cx="366" cy="100" r="6"/>
  <text class="qs-caption" x="430" y="104">case…</text>
  <path class="qs-edge" d="M290 116 H360 V160 H430"/>
  <circle class="qs-port" cx="436" cy="160" r="6"/>
  <text class="qs-caption" x="500" y="164">default</text>
</svg>
<figcaption>${meta.blurb}</figcaption>
</figure>`;
	}

	if (kind === "multiIn") {
		return `<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title} ports">
${DIAGRAM_DEFS}
  <circle class="qs-port" cx="48" cy="50" r="6"/>
  <circle class="qs-port" cx="48" cy="90" r="6"/>
  <text class="qs-caption" x="48" y="120" text-anchor="middle">in ×N</text>
  <line class="qs-edge" x1="54" y1="50" x2="150" y2="65"/>
  <line class="qs-edge" x1="54" y1="90" x2="150" y2="75"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">${title}</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>${meta.blurb}</figcaption>
</figure>`;
	}

	if (kind === "formPause") {
		const inX = 44;
		const outX = 476;
		const nodeX = 148;
		const nodeY = 34;
		const nodeW = 200;
		const nodeH = 56;
		const nodeCy = nodeY + nodeH / 2;
		const badgeW = 44;
		const badgeH = 18;
		const badgeX = nodeX + nodeW - badgeW - 8;
		const badgeY = nodeY + 8;
		return `<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 148" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title} pause ports">
${DIAGRAM_DEFS}
  <circle class="qs-port" cx="${inX}" cy="${nodeCy}" r="6"/>
  ${svgText(inX, nodeCy + 16, "in", "qs-caption qs-text-below", "middle", "hanging")}
  <line class="qs-edge" x1="${inX + 6}" y1="${nodeCy}" x2="${nodeX}" y2="${nodeCy}"/>
  <rect class="qs-node qs-node-accent" x="${nodeX}" y="${nodeY}" width="${nodeW}" height="${nodeH}" rx="8"/>
  ${svgText(nodeX + 16, nodeCy, title, "qs-label qs-text-aligned")}
  <rect class="qs-badge" x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="4"/>
  ${svgText(badgeX + badgeW / 2, badgeY + badgeH / 2, "await", "qs-badge-text qs-text-aligned", "middle")}
  <line class="qs-edge" x1="${nodeX + nodeW}" y1="${nodeCy}" x2="${outX - 6}" y2="${nodeCy}"/>
  <circle class="qs-port" cx="${outX}" cy="${nodeCy}" r="6"/>
  ${svgText(outX, nodeCy + 16, "out", "qs-caption qs-text-below", "middle", "hanging")}
  ${svgText(260, 126, "Pauses until Submit (desktop) or --forms (CLI)", "qs-caption qs-text-aligned", "middle")}
</svg>
<figcaption>${meta.blurb}</figcaption>
</figure>`;
	}

	return `<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title} ports">
${DIAGRAM_DEFS}
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">${title}</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>${meta.blurb} Multiple outgoing edges (fan-out) share the same output.</figcaption>
</figure>`;
}

/** Framed subgraph container — single diagram for try / foreach (matches desktop canvas). */
export function frameSvg(type: "try" | "foreach", title = type): string {
	const isTry = type === "try";
	const frameX = 64;
	const frameY = 48;
	const frameW = 440;
	const frameH = 172;
	const frameRight = frameX + frameW;
	const frameBottom = frameY + frameH;
	const headerH = 36;
	const headerBottom = frameY + headerH;
	const headerCy = frameY + headerH / 2;
	const frameInY = Math.round(frameY + 2.125 * DESKTOP_REM_PX);
	const innerX = frameX + FRAME_INSET;
	const innerY = headerBottom + FRAME_INSET;
	const innerW = frameW - FRAME_INSET * 2;
	const innerH = frameBottom - innerY - FRAME_INSET;
	const innerRight = innerX + innerW;
	const portY = Math.round(frameY + frameH * 0.62);
	const childW = 96;
	const childH = 44;
	const childX = Math.round(innerX + (innerW - childW) / 2);
	const outerInX = 36;
	const outerOutX = frameRight + 36;
	const outerOuts = isTry
		? [
				{
					y: Math.round(frameY + 1.1 * DESKTOP_REM_PX),
					label: "success",
					cls: "qs-edge-ok",
				},
				{
					y: Math.round(frameY + 2.9 * DESKTOP_REM_PX),
					label: "failed",
					cls: "",
				},
			]
		: [{ y: frameInY, label: "complete", cls: "qs-edge-ok" }];
	const outerOutEdges = outerOuts
		.map((o) => {
			const edgeCls = o.cls ? `qs-edge ${o.cls}` : "qs-edge";
			return `  <line class="${edgeCls}" x1="${frameRight}" y1="${o.y}" x2="${outerOutX - PORT_R}" y2="${o.y}"/>`;
		})
		.join("\n");
	const outerOutPorts = outerOuts
		.map((o) => outerPortDot(outerOutX, o.y))
		.join("\n");
	const outerOutLabels = outerOuts
		.map((o) =>
			isTry
				? svgText(outerOutX + 12, o.y, `${o.label} ×1`, "qs-caption")
				: outerPortLabel(outerOutX, o.y, o.label),
		)
		.join("\n");
	const caption = isTry
		? "Header: outside <code>in</code> → frame, then <code>success</code> or <code>failed</code> out. Body: one <code>entry</code> → child → <code>exit</code> path on the inner border."
		: "Header: outside <code>in</code> → frame, then <code>complete</code> out. Body: <code>entry</code> → child → <code>exit</code> runs once per item.";

	const frameR = 10;

	return `<figure class="qs-diagram qs-diagram-frame">
<svg class="qs-svg" viewBox="0 0 640 248" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title} frame ports and wiring">
${DIAGRAM_DEFS}
  ${svgText(320, 22, "Header ports = outside flow · entry/exit = inside body only", "qs-caption", "middle")}
  <rect class="qs-node qs-node-accent" x="${frameX}" y="${frameY}" width="${frameW}" height="${frameH}" rx="${frameR}"/>
  <path class="qs-frame-header" d="${frameHeaderPath(frameX, frameY, frameW, headerH, frameR)}"/>
  <line x1="${frameX}" y1="${headerBottom}" x2="${frameRight}" y2="${headerBottom}" stroke="var(--qs-line)" stroke-width="1"/>
  ${svgText(frameX + 14, headerCy, title, "qs-label")}
  <rect class="qs-node" x="${innerX}" y="${innerY}" width="${innerW}" height="${innerH}" rx="8" stroke-dasharray="5 4"/>
  ${svgText(innerX + innerW / 2, innerY + 14, "body · parentId children", "qs-caption", "middle")}
  <rect class="qs-node" x="${childX}" y="${portY - childH / 2}" width="${childW}" height="${childH}" rx="8"/>
  ${svgText(childX + childW / 2, portY, "child", "qs-label", "middle")}
  <line class="qs-edge" x1="${outerInX + PORT_R}" y1="${frameInY}" x2="${frameX}" y2="${frameInY}"/>
${outerOutEdges}
  <line class="qs-edge qs-edge-ok" x1="${innerX + PORT_R}" y1="${portY}" x2="${childX}" y2="${portY}"/>
  <line class="qs-edge qs-edge-ok" x1="${childX + childW}" y1="${portY}" x2="${innerRight - PORT_R}" y2="${portY}"/>
${outerPortDot(outerInX, frameInY)}
${outerOutPorts}
${innerPortArc("entry", innerX, portY)}
${innerPortArc("exit", innerRight, portY)}
${outerPortLabel(outerInX, frameInY, "in")}
${outerOutLabels}
${innerPortLabel(innerX + PORT_R + 2, portY, "entry", "start")}
${innerPortLabel(innerRight - PORT_R - 2, portY, "exit", "end")}
  ${svgText(320, 230, "entry = sourceHandle · exit = targetHandle", "qs-mono", "middle")}
</svg>
<figcaption>${caption}</figcaption>
</figure>`;
}

/** Mid-flow form await — used in concepts / workspace pages. */
export function formFlowSvg(): string {
	return `<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 760 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mid-flow form await">
${DIAGRAM_DEFS}
  <text class="qs-caption" x="380" y="22" text-anchor="middle">search → pick → confirm (each form node pauses the run)</text>
  <rect class="qs-node" x="24" y="72" width="88" height="48" rx="8"/>
  <text class="qs-label" x="68" y="102" text-anchor="middle">http</text>
  <text class="qs-caption" x="68" y="138" text-anchor="middle">search</text>
  <line class="qs-edge" x1="112" y1="96" x2="148" y2="96"/>
  <rect class="qs-node qs-node-accent" x="150" y="72" width="100" height="48" rx="8"/>
  <text class="qs-label" x="200" y="96" text-anchor="middle">form</text>
  <rect class="qs-badge" x="168" y="78" width="40" height="16" rx="3"/>
  <text class="qs-badge-text" x="188" y="89" text-anchor="middle">await</text>
  <text class="qs-caption" x="200" y="138" text-anchor="middle">pick</text>
  <line class="qs-edge" x1="250" y1="96" x2="286" y2="96"/>
  <rect class="qs-node" x="288" y="72" width="88" height="48" rx="8"/>
  <text class="qs-label" x="332" y="102" text-anchor="middle">http</text>
  <text class="qs-caption" x="332" y="138" text-anchor="middle">detail</text>
  <line class="qs-edge" x1="376" y1="96" x2="412" y2="96"/>
  <rect class="qs-node qs-node-accent" x="414" y="72" width="100" height="48" rx="8"/>
  <text class="qs-label" x="464" y="96" text-anchor="middle">form</text>
  <rect class="qs-badge" x="432" y="78" width="40" height="16" rx="3"/>
  <text class="qs-badge-text" x="452" y="89" text-anchor="middle">await</text>
  <text class="qs-caption" x="464" y="138" text-anchor="middle">confirm</text>
  <line class="qs-edge" x1="514" y1="96" x2="550" y2="96"/>
  <rect class="qs-node" x="552" y="72" width="88" height="48" rx="8"/>
  <text class="qs-label" x="596" y="102" text-anchor="middle">http</text>
  <text class="qs-caption" x="596" y="138" text-anchor="middle">cart</text>
  <text class="qs-mono" x="200" y="168" text-anchor="middle" style="font-size:10px">{{nodes.pickForm.productId}}</text>
  <text class="qs-mono" x="464" y="168" text-anchor="middle" style="font-size:10px">{{nodes.detailForm.quantity}}</text>
</svg>
<figcaption>Bind reusable form inputs with <code>bindings</code> (e.g. <code>products: "{{nodes.search.body.products}}"</code>). Later steps read <code>{{nodes.&lt;formNodeId&gt;.fieldId}}</code>.</figcaption>
</figure>`;
}

/** Diamond fan-in with join — used in concepts page. */
export function joinDiamondSvg(): string {
	return `<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 640 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diamond reconvergence with join">
${DIAGRAM_DEFS}
  <text class="qs-caption" x="320" y="22" text-anchor="middle">After if/switch/try branches — reconverge with join (N inputs → 1 collect-map)</text>
  <rect class="qs-node qs-node-accent" x="24" y="96" width="72" height="44" rx="8"/>
  <text class="qs-label" x="60" y="124" text-anchor="middle">a</text>
  <line class="qs-edge" x1="96" y1="118" x2="132" y2="118"/>
  <rect class="qs-node" x="134" y="96" width="72" height="44" rx="8"/>
  <text class="qs-label" x="170" y="124" text-anchor="middle">b</text>
  <path class="qs-edge qs-edge-ok" d="M206 110 H260 V168 H340"/>
  <rect class="qs-node" x="134" y="168" width="72" height="44" rx="8"/>
  <text class="qs-label" x="170" y="196" text-anchor="middle">c</text>
  <path class="qs-edge qs-edge-ok" d="M206 190 H340"/>
  <rect class="qs-node qs-node-accent" x="340" y="128" width="88" height="52" rx="8"/>
  <text class="qs-label" x="384" y="160" text-anchor="middle">join</text>
  <circle class="qs-port" cx="334" cy="146" r="5"/>
  <circle class="qs-port" cx="334" cy="178" r="5"/>
  <line class="qs-edge qs-edge-ok" x1="428" y1="154" x2="480" y2="154"/>
  <rect class="qs-node" x="482" y="128" width="88" height="52" rx="8"/>
  <text class="qs-label" x="526" y="160" text-anchor="middle">next</text>
  <text class="qs-mono" x="384" y="210" text-anchor="middle" style="font-size:10px">{ b: …, c: … }</text>
  <text class="qs-caption" x="170" y="72" text-anchor="middle">true arm</text>
  <text class="qs-caption" x="170" y="228" text-anchor="middle">false arm</text>
</svg>
<figcaption>Exclusive branches skip untaken arms. Diamond fan-out waits for <strong>both</strong> arms. Use <a href="../nodes/merge/">merge</a> when you need deep-merge of named bags on a single wire instead.</figcaption>
</figure>`;
}
