---
title: How flows work
description: How nodes connect, what edges carry, and how wire data differs from {{input}} / {{nodes}}
---

A **flow** is a directed graph of nodes. Edges decide **run order**. The JSON that travels across an edge is the **wire** (execute input of the next node). Templates like `{{input.*}}` and `{{nodes.id.*}}` are a separate layer.

## Quick picture — how data moves

Labels on the arrows show **what JSON** the next node receives as execute input.

<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 760 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="qs-chain-title">
  <title id="qs-chain-title">Data moving along start → input → http → extract</title>
  <defs>
    <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
    </marker>
  </defs>
  <rect class="qs-node" x="16" y="72" width="100" height="52" rx="8"/>
  <text class="qs-label" x="66" y="104" text-anchor="middle">start</text>
  <text class="qs-caption" x="66" y="148" text-anchor="middle">entry</text>
  <line class="qs-edge" x1="116" y1="98" x2="154" y2="98" marker-end="url(#qs-arrow)"/>
  <text class="qs-data" x="135" y="58" text-anchor="middle">{}</text>
  <rect class="qs-node qs-node-accent" x="156" y="72" width="100" height="52" rx="8"/>
  <text class="qs-label" x="206" y="104" text-anchor="middle">input</text>
  <text class="qs-caption" x="206" y="148" text-anchor="middle">run payload</text>
  <line class="qs-edge" x1="256" y1="98" x2="294" y2="98" marker-end="url(#qs-arrow)"/>
  <text class="qs-data" x="275" y="52" text-anchor="middle">{ productId }</text>
  <rect class="qs-node" x="296" y="72" width="100" height="52" rx="8"/>
  <text class="qs-label" x="346" y="104" text-anchor="middle">http</text>
  <text class="qs-caption" x="346" y="148" text-anchor="middle">URL uses</text>
  <text class="qs-caption" x="346" y="164" text-anchor="middle">{{input.productId}}</text>
  <line class="qs-edge" x1="396" y1="98" x2="434" y2="98" marker-end="url(#qs-arrow)"/>
  <text class="qs-data" x="415" y="48" text-anchor="middle">{ status,</text>
  <text class="qs-data" x="415" y="62" text-anchor="middle">body… }</text>
  <rect class="qs-node" x="436" y="72" width="100" height="52" rx="8"/>
  <text class="qs-label" x="486" y="104" text-anchor="middle">extract</text>
  <text class="qs-caption" x="486" y="148" text-anchor="middle">JMESPath</text>
  <text class="qs-mono" x="486" y="166" text-anchor="middle" style="font-size:11px">body.title</text>
  <line class="qs-edge" x1="536" y1="98" x2="574" y2="98" marker-end="url(#qs-arrow)"/>
  <text class="qs-data" x="555" y="58" text-anchor="middle">"Mascara"</text>
  <rect class="qs-node" x="576" y="72" width="80" height="52" rx="8"/>
  <text class="qs-label" x="616" y="104" text-anchor="middle">…</text>
  <text class="qs-caption" x="380" y="198" text-anchor="middle">Wire = previous output. extract / assert / json read it with JMESPath — not mustache.</text>
</svg>
<figcaption>Same shape as <code>demo-main-nodes.flow.json</code>. Later strings can also use <code>{{nodes.fetchProduct.body.title}}</code>.</figcaption>
</figure>

## How nodes connect

Sketches with a red **Fails validation** badge show an **invalid** graph. Those cases break `quester validate` and desktop save checks.

<div class="qs-rule-list">

<div class="qs-rule">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <marker id="qs-a1" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--qs-ok)"/>
    </marker>
  </defs>
  <rect class="qs-node qs-node-accent" x="12" y="28" width="70" height="34" rx="6"/>
  <text class="qs-label" x="47" y="50" text-anchor="middle">start</text>
  <line class="qs-edge qs-edge-ok" x1="82" y1="45" x2="110" y2="45" marker-end="url(#qs-a1)"/>
  <rect class="qs-node" x="112" y="28" width="70" height="34" rx="6"/>
  <text class="qs-label" x="147" y="50" text-anchor="middle">http</text>
</svg>
</figure>
<div>
<strong>Exactly one <a href="../nodes/start/">start</a></strong>
<p>Required. No incoming edges. At most <strong>one</strong> outgoing edge. This sketch is valid — zero starts, two starts, or <code>http → start</code> fail validation.</p>
</div>
</div>

<div class="qs-rule qs-rule-break">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <marker id="qs-a2" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 Z" fill="var(--qs-faint)"/>
    </marker>
  </defs>
  <rect class="qs-node qs-node-accent" x="12" y="18" width="56" height="28" rx="6"/>
  <text class="qs-label" x="40" y="37" text-anchor="middle">start</text>
  <line class="qs-edge" x1="68" y1="32" x2="96" y2="32" marker-end="url(#qs-a2)"/>
  <rect class="qs-node" x="98" y="18" width="56" height="28" rx="6"/>
  <text class="qs-label" x="126" y="37" text-anchor="middle">http</text>
  <rect class="qs-node qs-node-deny" x="98" y="60" width="70" height="28" rx="6"/>
  <text class="qs-label" x="133" y="79" text-anchor="middle">orphan</text>
  <text class="qs-caption" x="40" y="84" text-anchor="middle">reachable</text>
</svg>
</figure>
<div>
<strong>Executable nodes must be reachable from start</strong>
<p>Orphan steps have no path from <code>start</code>. They fail validation (except <a href="../nodes/note/">note</a> stickies).</p>
<span class="qs-break">Fails validation</span>
</div>
</div>

<div class="qs-rule qs-rule-break">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect class="qs-node qs-node-deny" x="20" y="28" width="56" height="34" rx="6"/>
  <text class="qs-label" x="48" y="50" text-anchor="middle">a</text>
  <line class="qs-edge qs-edge-deny" x1="76" y1="38" x2="122" y2="38"/>
  <line class="qs-edge qs-edge-deny" x1="122" y1="52" x2="76" y2="52"/>
  <rect class="qs-node qs-node-deny" x="124" y="28" width="56" height="34" rx="6"/>
  <text class="qs-label" x="152" y="50" text-anchor="middle">b</text>
  <line class="qs-x" x1="90" y1="36" x2="110" y2="56"/>
  <line class="qs-x" x1="110" y1="36" x2="90" y2="56"/>
</svg>
</figure>
<div>
<strong>No cycles</strong>
<p>The graph must be a DAG. <code>a → b → a</code> (or any longer loop) fails validation.</p>
<span class="qs-break">Fails validation</span>
</div>
</div>

<div class="qs-rule qs-rule-break">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect class="qs-node qs-node-deny" x="20" y="28" width="64" height="34" rx="6"/>
  <text class="qs-label" x="52" y="50" text-anchor="middle">note</text>
  <line class="qs-edge qs-edge-deny" x1="84" y1="45" x2="116" y2="45"/>
  <line class="qs-x" x1="92" y1="36" x2="108" y2="54"/>
  <line class="qs-x" x1="108" y1="36" x2="92" y2="54"/>
  <rect class="qs-node qs-node-deny" x="118" y="28" width="64" height="34" rx="6"/>
  <text class="qs-label" x="150" y="50" text-anchor="middle">http</text>
</svg>
</figure>
<div>
<strong><a href="../nodes/note/">note</a> stays offline</strong>
<p>No handles. Any edge to or from a note is invalid. Notes may sit disconnected.</p>
<span class="qs-break">Fails validation</span>
</div>
</div>

<div class="qs-rule qs-rule-break">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect class="qs-node" x="12" y="22" width="64" height="34" rx="6"/>
  <text class="qs-label" x="44" y="44" text-anchor="middle">http</text>
  <line class="qs-edge qs-edge-deny" x1="76" y1="39" x2="112" y2="39"/>
  <line class="qs-x" x1="86" y1="30" x2="102" y2="48"/>
  <line class="qs-x" x1="102" y1="30" x2="86" y2="48"/>
  <rect class="qs-node qs-node-deny" x="114" y="22" width="74" height="34" rx="6"/>
  <text class="qs-label" x="151" y="44" text-anchor="middle">missing</text>
  <text class="qs-caption" x="100" y="78" text-anchor="middle">target: "missing"</text>
  <text class="qs-caption" x="100" y="94" text-anchor="middle">no such node id</text>
</svg>
</figure>
<div>
<strong>Edges need real node ids</strong>
<p>Each edge’s <code>source</code> and <code>target</code> must equal an existing node <code>id</code> in that flow. Typos, renamed nodes, and deleted ids all fail (same for a bad <code>source</code>).</p>
<span class="qs-break">Fails validation</span>
</div>
</div>

<div class="qs-rule qs-rule-break">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect class="qs-node qs-node-deny" x="24" y="18" width="70" height="28" rx="6"/>
  <text class="qs-label" x="59" y="37" text-anchor="middle">login</text>
  <rect class="qs-node qs-node-deny" x="106" y="18" width="70" height="28" rx="6"/>
  <text class="qs-label" x="141" y="37" text-anchor="middle">login</text>
  <line class="qs-x" x1="88" y1="50" x2="112" y2="74"/>
  <line class="qs-x" x1="112" y1="50" x2="88" y2="74"/>
  <text class="qs-caption" x="100" y="84" text-anchor="middle">same id ×2</text>
</svg>
</figure>
<div>
<strong>Duplicate node ids</strong>
<p>Every node id in a flow must be unique.</p>
<span class="qs-break">Fails validation</span>
</div>
</div>

</div>

## Ports (handles) and edges

Desktop shows **target** (in) and **source** (out) ports. Branch nodes expose **named** source handles.

<div class="qs-rule-list">

<div class="qs-rule">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle class="qs-port" cx="28" cy="35" r="5"/>
  <line class="qs-edge" x1="33" y1="35" x2="60" y2="35"/>
  <rect class="qs-node qs-node-accent" x="60" y="16" width="80" height="38" rx="6"/>
  <text class="qs-label" x="100" y="40" text-anchor="middle">http</text>
  <line class="qs-edge" x1="140" y1="35" x2="167" y2="35"/>
  <circle class="qs-port" cx="172" cy="35" r="5"/>
</svg>
</figure>
<div>
<strong>Linear step</strong>
<p>In ×1 · out ×1. Fan-out allowed — several children get the same wire.</p>
</div>
</div>

<div class="qs-rule">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect class="qs-node qs-node-accent" x="20" y="16" width="80" height="38" rx="6"/>
  <text class="qs-label" x="60" y="40" text-anchor="middle">start</text>
  <line class="qs-edge" x1="100" y1="35" x2="140" y2="35"/>
  <circle class="qs-port" cx="145" cy="35" r="5"/>
  <text class="qs-caption" x="170" y="39">×1</text>
</svg>
</figure>
<div>
<strong><a href="../nodes/start/">start</a></strong>
<p>In ×0 · out ×1 · <strong>max one</strong> outgoing edge.</p>
</div>
</div>

<div class="qs-rule">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle class="qs-port" cx="28" cy="35" r="5"/>
  <line class="qs-edge" x1="33" y1="35" x2="70" y2="35"/>
  <rect class="qs-node qs-node-accent" x="70" y="16" width="90" height="38" rx="6"/>
  <text class="qs-label" x="115" y="40" text-anchor="middle">output</text>
</svg>
</figure>
<div>
<strong><a href="../nodes/output/">output</a></strong>
<p>In ×1 · out ×0. Terminal for that path.</p>
</div>
</div>

<div class="qs-rule">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle class="qs-port" cx="18" cy="50" r="5"/>
  <line class="qs-edge" x1="23" y1="50" x2="48" y2="50"/>
  <rect class="qs-node qs-node-accent" x="48" y="33" width="56" height="34" rx="6"/>
  <text class="qs-label" x="76" y="55" text-anchor="middle">if</text>
  <path class="qs-edge qs-edge-ok" d="M104 42 H128 V22 H150"/>
  <circle class="qs-port" cx="155" cy="22" r="4"/>
  <text class="qs-caption" x="176" y="26">true</text>
  <path class="qs-edge" d="M104 58 H128 V78 H150"/>
  <circle class="qs-port" cx="155" cy="78" r="4"/>
  <text class="qs-caption" x="178" y="82">false</text>
</svg>
</figure>
<div>
<strong><a href="../nodes/if/">if</a> / <a href="../nodes/try/">try</a></strong>
<p>In ×1 · two named outs. Engine follows matching <code>sourceHandle</code>.</p>
</div>
</div>

<div class="qs-rule">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle class="qs-port" cx="16" cy="55" r="5"/>
  <line class="qs-edge" x1="21" y1="55" x2="44" y2="55"/>
  <rect class="qs-node qs-node-accent" x="44" y="38" width="64" height="34" rx="6"/>
  <text class="qs-label" x="76" y="60" text-anchor="middle">switch</text>
  <path class="qs-edge" d="M108 48 H128 V18 H150"/>
  <circle class="qs-port" cx="155" cy="18" r="4"/>
  <text class="qs-caption" x="172" y="22">case</text>
  <path class="qs-edge" d="M108 55 H150"/>
  <circle class="qs-port" cx="155" cy="55" r="4"/>
  <text class="qs-caption" x="172" y="59">case</text>
  <path class="qs-edge" d="M108 62 H128 V92 H150"/>
  <circle class="qs-port" cx="155" cy="92" r="4"/>
  <text class="qs-caption" x="178" y="96">default</text>
</svg>
</figure>
<div>
<strong><a href="../nodes/switch/">switch</a></strong>
<p>In ×1 · one named handle per case + <code>default</code>. Only the matching case runs.</p>
</div>
</div>

<div class="qs-rule">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect class="qs-node qs-node-deny" x="60" y="16" width="80" height="38" rx="6"/>
  <text class="qs-label" x="100" y="40" text-anchor="middle">note</text>
</svg>
</figure>
<div>
<strong><a href="../nodes/note/">note</a></strong>
<p>In ×0 · out ×0 · no edges.</p>
</div>
</div>

</div>

<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 720 230" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Fan-out versus branch handles">
  <defs>
    <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
    </marker>
    <marker id="qs-arrow-ok" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-ok)"/>
    </marker>
  </defs>
  <text class="qs-caption" x="175" y="22" text-anchor="middle">fan-out — every child runs</text>
  <rect class="qs-node qs-node-accent" x="24" y="88" width="88" height="44" rx="8"/>
  <text class="qs-label" x="68" y="116" text-anchor="middle">http</text>
  <path class="qs-edge" d="M112 100 H148 V48 H200" marker-end="url(#qs-arrow)"/>
  <text class="qs-caption" x="168" y="40" text-anchor="middle">1st</text>
  <rect class="qs-node" x="202" y="28" width="96" height="40" rx="8"/>
  <text class="qs-label" x="250" y="54" text-anchor="middle">assert</text>
  <path class="qs-edge" d="M112 120 H148 V172 H200" marker-end="url(#qs-arrow)"/>
  <text class="qs-caption" x="168" y="186" text-anchor="middle">2nd</text>
  <rect class="qs-node" x="202" y="152" width="96" height="40" rx="8"/>
  <text class="qs-label" x="250" y="178" text-anchor="middle">extract</text>
  <rect class="qs-badge" x="88" y="200" width="120" height="22" rx="4"/>
  <text class="qs-mono" x="148" y="215" text-anchor="middle" style="font-size:10px">same wire JSON</text>
  <text class="qs-caption" x="520" y="22" text-anchor="middle">branch — one path only</text>
  <rect class="qs-node qs-node-accent" x="380" y="88" width="72" height="44" rx="8"/>
  <text class="qs-label" x="416" y="116" text-anchor="middle">if</text>
  <path class="qs-edge qs-edge-ok" d="M452 100 H500 V48 H548" marker-end="url(#qs-arrow-ok)"/>
  <text class="qs-caption" x="520" y="40" text-anchor="middle">true · runs</text>
  <rect class="qs-node" x="550" y="28" width="72" height="40" rx="8"/>
  <text class="qs-label" x="586" y="54" text-anchor="middle">A</text>
  <path class="qs-edge qs-edge-deny" d="M452 120 H500 V172 H548"/>
  <text class="qs-caption" x="520" y="186" text-anchor="middle">false · skipped</text>
  <rect class="qs-node qs-node-deny" x="550" y="152" width="72" height="40" rx="8"/>
  <text class="qs-label" x="586" y="178" text-anchor="middle">B</text>
</svg>
<figcaption><strong>Fan-out:</strong> both children run, one after another (not in parallel), in the order edges are listed in the flow file — here assert then extract. Each gets the same http response as execute input.<br/>
<strong>Branch:</strong> only the matching handle runs (here <code>true → A</code>); the other edge is skipped.</figcaption>
</figure>

<div class="qs-callout qs-callout-warn">

**One incoming edge** per node, except [`join`](../nodes/join/) which accepts N. For diamonds or reconvergence after branches, insert a `join` (collect-map of predecessor outputs). Deep-merge named bags with [`merge`](../nodes/merge/) (still one wire in).

</div>

<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 640 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diamond reconvergence with join">
  <defs>
    <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
    </marker>
  </defs>
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
</figure>

## Framed containers (`try` / `foreach`)

[`try`](../nodes/try/) and [`foreach`](../nodes/foreach/) are **framed subgraphs** on the canvas. Outside wires attach only to the frame (`in`, then `success`/`failed` or `complete`). Inside, wire **one** path: `entry` → body children → `exit`. Body nodes use `parentId` pointing at the frame.

Both frame types may nest inside each other (sample: `nested-frames.flow.json`). See the frame diagrams on the [try](../nodes/try/) and [foreach](../nodes/foreach/) pages.

## Mid-flow forms

[`form`](../nodes/form/) nodes pause the run until values are submitted (desktop UI) or supplied via CLI `--forms`. Unlike the [`input`](../nodes/input/) node (run payload once at the start), a flow may include **multiple** form steps.

<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 760 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mid-flow form await">
  <defs>
    <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
    </marker>
  </defs>
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
<figcaption>Bind reusable form inputs with <code>bindings</code> (e.g. <code>products: "{{nodes.search.body.products}}"</code>). Later steps read <code>{{nodes.&lt;formNodeId&gt;.fieldId}}</code>. Author forms under <code>forms/*.form.json</code> — see <a href="../workspace/#forms-formjson">Workspace files</a>.</figcaption>
</figure>

## Wire data vs templates

When `http` finishes, the next node’s **execute input** is already the response object.

<div class="qs-rule-list">

<div class="qs-rule">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect class="qs-node" x="16" y="22" width="70" height="36" rx="6"/>
  <text class="qs-label" x="51" y="45" text-anchor="middle">http</text>
  <line class="qs-edge" x1="86" y1="40" x2="110" y2="40"/>
  <rect class="qs-node qs-node-accent" x="112" y="22" width="72" height="36" rx="6"/>
  <text class="qs-mono" x="148" y="45" text-anchor="middle" style="font-size:10px">body.id</text>
</svg>
</figure>
<div>
<strong>Wire / JMESPath</strong>
<p>On extract, assert, json, if checks: <code>body.title</code>, <code>status</code>, <code>products[0].id</code>.</p>
</div>
</div>

<div class="qs-rule">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect class="qs-badge" x="20" y="22" width="160" height="36" rx="6"/>
  <text class="qs-mono" x="100" y="45" text-anchor="middle" style="font-size:10px">{{nodes.login.body.id}}</text>
</svg>
</figure>
<div>
<strong>Named node template</strong>
<p>Any later string field, by node id.</p>
</div>
</div>

<div class="qs-rule">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect class="qs-badge" x="30" y="22" width="140" height="36" rx="6"/>
  <text class="qs-mono" x="100" y="45" text-anchor="middle" style="font-size:10px">{{input.productId}}</text>
</svg>
</figure>
<div>
<strong>Run input template</strong>
<p>Run panel / CLI <code>--input</code> — not the same as the <code>input</code> node.</p>
</div>
</div>

<div class="qs-rule">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect class="qs-badge" x="24" y="22" width="152" height="36" rx="6"/>
  <text class="qs-mono" x="100" y="45" text-anchor="middle" style="font-size:10px">{{env}} {{vars}}</text>
</svg>
</figure>
<div>
<strong>Env / secrets / vars</strong>
<p><code>{{env.API_BASE}}</code>, <code>{{secrets.TOKEN}}</code>, <code>{{vars.token}}</code>.</p>
</div>
</div>

</div>

There is **no** `{{previous.*}}` mustache scope. Previous output is already the wire.

## Three meanings of “input”

<div class="qs-rule-list">

<div class="qs-rule">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <line class="qs-edge" x1="20" y1="35" x2="70" y2="35"/>
  <text class="qs-data" x="45" y="24" text-anchor="middle">wire</text>
  <rect class="qs-node" x="72" y="16" width="100" height="38" rx="6"/>
  <text class="qs-label" x="122" y="40" text-anchor="middle">execute()</text>
</svg>
</figure>
<div>
<strong>Execute input</strong>
<p>JSON on the wire into <code>execute()</code> (previous node output).</p>
</div>
</div>

<div class="qs-rule">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect class="qs-badge" x="24" y="16" width="152" height="38" rx="6"/>
  <text class="qs-mono" x="100" y="40" text-anchor="middle" style="font-size:11px">{{input.*}}</text>
</svg>
</figure>
<div>
<strong>Run input</strong>
<p>Object from Run panel / CLI <code>--input</code>.</p>
</div>
</div>

<div class="qs-rule">
<figure class="qs-diagram qs-diagram-sm">
<svg class="qs-svg" viewBox="0 0 200 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect class="qs-node qs-node-accent" x="50" y="16" width="100" height="38" rx="6"/>
  <text class="qs-label" x="100" y="40" text-anchor="middle">input</text>
</svg>
</figure>
<div>
<strong><code>input</code> node</strong>
<p>Copies run input onto the wire for the next step. Optional if you only need <code>{{input.field}}</code>.</p>
</div>
</div>

</div>

## How a step runs

1. Resolve templates in that node’s string fields.
2. Call `execute(wireJson, context)`.
3. Store the return value as `{{nodes.<id>}}`.
4. Enqueue next edges (all for linear fan-out; filtered by handle for branches).

## Cheat sheet

| I need… | Use |
| --- | --- |
| Field from the last HTTP response in extract | `body.id` / `products[0]` |
| Same field later in a string | `{{nodes.httpId.body.id}}` |
| Run panel field | `{{input.field}}` |
| Env / secret / set var | `{{env.*}}` / `{{secrets.*}}` / `{{vars.*}}` |
| Sticky text on canvas | `note` (not executed) |
| Mid-flow user input | [`form`](../nodes/form/) (pauses until submit) |
| Reconverge branch arms | [`join`](../nodes/join/) |

## Related

- [Template syntax](../templates/)
- [Nodes overview](../nodes/) — ports per type
- [Getting started](../getting-started/)
