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
		return `<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title} pause ports">
${DIAGRAM_DEFS}
  <circle class="qs-port" cx="40" cy="62" r="6"/>
  <text class="qs-caption" x="40" y="88" text-anchor="middle">in</text>
  <line class="qs-edge" x1="46" y1="62" x2="118" y2="62"/>
  <rect class="qs-node qs-node-accent" x="118" y="36" width="180" height="52" rx="8"/>
  <text class="qs-label" x="208" y="68" text-anchor="middle">${title}</text>
  <rect class="qs-badge" x="248" y="42" width="42" height="16" rx="4"/>
  <text class="qs-badge-text" x="269" y="53" text-anchor="middle">await</text>
  <line class="qs-edge" x1="298" y1="62" x2="370" y2="62"/>
  <circle class="qs-port" cx="376" cy="62" r="6"/>
  <text class="qs-caption" x="376" y="88" text-anchor="middle">out</text>
  <text class="qs-caption" x="260" y="118" text-anchor="middle">Pauses until Submit (desktop) or --forms (CLI)</text>
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
	const headerY = 58;
	const bodyY = 132;
	const frameX = 72;
	const frameW = 420;
	const innerX = 86;
	const innerW = 392;
	const innerRight = innerX + innerW;
	const frameRight = frameX + frameW;
	const outerOuts = isTry
		? [
				{ y: 48, label: "success", cls: "qs-edge-ok" },
				{ y: 68, label: "failed", cls: "" },
			]
		: [{ y: headerY, label: "complete", cls: "qs-edge-ok" }];
	const outerOutPaths = outerOuts
		.map(
			(o) => `
  <circle class="qs-port" cx="${frameRight}" cy="${o.y}" r="6"/>
  <text class="qs-caption" x="${frameRight + 14}" y="${o.y + 4}">${o.label}</text>
  <line class="qs-edge ${o.cls}" x1="${frameRight + 6}" y1="${o.y}" x2="${frameRight + 46}" y2="${o.y}"/>`,
		)
		.join("");
	const caption = isTry
		? "Header: outside <code>in</code> → frame, then <code>success</code> or <code>failed</code> out. Body: one <code>entry</code> → child → <code>exit</code> path on the inner border."
		: "Header: outside <code>in</code> → frame, then <code>complete</code> out. Body: <code>entry</code> → child → <code>exit</code> runs once per item.";

	return `<figure class="qs-diagram qs-diagram-frame">
<svg class="qs-svg" viewBox="0 0 620 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title} frame ports and wiring">
${DIAGRAM_DEFS}
  <text class="qs-caption" x="310" y="16" text-anchor="middle">Header ports = outside flow · entry/exit = inside body only</text>
  <line class="qs-edge" x1="8" y1="${headerY}" x2="${frameX}" y2="${headerY}"/>
  <circle class="qs-port" cx="${frameX}" cy="${headerY}" r="6"/>
  <text class="qs-caption" x="${frameX - 8}" y="${headerY + 18}" text-anchor="end">in</text>
  <rect class="qs-node qs-node-accent" x="${frameX}" y="36" width="${frameW}" height="148" rx="10" fill="color-mix(in oklch, var(--qs-accent) 5%, var(--qs-surface))"/>
  <rect x="${frameX}" y="36" width="${frameW}" height="36" rx="10" fill="color-mix(in oklch, var(--qs-accent) 12%, var(--qs-surface))" stroke="none"/>
  <line x1="${frameX}" y1="72" x2="${frameRight}" y2="72" stroke="var(--qs-line)" stroke-width="1"/>
  <text class="qs-label" x="${frameX + 14}" y="58">${title}</text>
  <text class="qs-caption" x="${frameX + frameW - 14}" y="58" text-anchor="end">header</text>${outerOutPaths}
  <rect class="qs-node" x="${innerX}" y="84" width="${innerW}" height="84" rx="8" stroke-dasharray="5 4" fill="color-mix(in oklch, var(--qs-accent) 3%, var(--qs-surface))"/>
  <text class="qs-caption" x="${innerX + innerW / 2}" y="100" text-anchor="middle">body · parentId children</text>
  <circle class="qs-port" cx="${innerX}" cy="${bodyY}" r="6"/>
  <text class="qs-caption" x="${innerX}" y="${bodyY + 18}" text-anchor="middle">entry</text>
  <line class="qs-edge qs-edge-ok" x1="${innerX + 6}" y1="${bodyY}" x2="228" y2="${bodyY}"/>
  <rect class="qs-node" x="228" y="${bodyY - 22}" width="96" height="44" rx="8"/>
  <text class="qs-label" x="276" y="${bodyY + 6}" text-anchor="middle">child</text>
  <line class="qs-edge qs-edge-ok" x1="324" y1="${bodyY}" x2="${innerRight - 6}" y2="${bodyY}"/>
  <circle class="qs-port" cx="${innerRight}" cy="${bodyY}" r="6"/>
  <text class="qs-caption" x="${innerRight}" y="${bodyY + 18}" text-anchor="middle">exit</text>
  <text class="qs-mono" x="310" y="198" text-anchor="middle" style="font-size:10px">entry = sourceHandle · exit = targetHandle</text>
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
