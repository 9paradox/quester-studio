/** Shared SVG marker defs — include once per diagram via DiagramDefs snippet. */
export const DIAGRAM_DEFS = `
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
`.trim();

export type PortKind =
	| "none"
	| "one"
	| "branch2"
	| "branchN"
	| "sourceOnly"
	| "targetOnly";

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
	foreach: { in: "1", out: "1", kind: "one", blurb: "Maps an array (capped)." },
	try: {
		in: "1",
		out: "ok · catch",
		kind: "branch2",
		blurb: "Soft-fail branch handles.",
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
		const [a, b] = type === "try" ? ["ok", "catch"] : ["true", "false"];
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
