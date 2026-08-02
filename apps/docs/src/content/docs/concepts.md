---
title: How flows work
description: Core concepts — nodes, wire data, {{input}} vs the input node, and previous-node JMESPath
---

Quester runs **flows**: ordered graphs of nodes. Each node takes data from the previous step (the **wire**), does work, and writes an output other steps can read later.

If you only skim one page, skim this one — early testers usually trip on the word **input** and on bare `previous.body` (missing `{{…}}`, or used inside JMESPath).

## Mental model

Three layers matter at once:

1. **The graph** — edges decide *order* (`start → input → http → extract`).
2. **The wire** — each node’s execute input is the **previous node’s output**.
3. **Template scopes** — `{{input.*}}`, `{{env.*}}`, `{{vars.*}}`, `{{nodes.id…}}` are available while a node runs (they are not the same thing as the wire).

<figure class="qs-diagram">
<svg viewBox="0 0 720 168" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="qs-chain-title qs-chain-desc">
  <title id="qs-chain-title">Typical flow chain</title>
  <desc id="qs-chain-desc">start connects to input, then http, then extract. Arrows carry previous output on the wire.</desc>
  <defs>
    <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <rect x="16" y="36" width="120" height="56" rx="8" fill="var(--sl-color-bg)" stroke="var(--sl-color-gray-4)" stroke-width="1.5"/>
  <text x="76" y="70" text-anchor="middle" fill="var(--sl-color-white)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="15" font-weight="600">start</text>
  <line x1="136" y1="64" x2="168" y2="64" stroke="var(--sl-color-gray-3)" stroke-width="2" marker-end="url(#qs-arrow)"/>
  <text x="152" y="28" text-anchor="middle" fill="var(--sl-color-gray-2)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11">{}</text>

  <rect x="176" y="36" width="120" height="56" rx="8" fill="var(--sl-color-bg)" stroke="var(--sl-color-accent)" stroke-width="2"/>
  <text x="236" y="70" text-anchor="middle" fill="var(--sl-color-white)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="15" font-weight="600">input</text>
  <line x1="296" y1="64" x2="328" y2="64" stroke="var(--sl-color-gray-3)" stroke-width="2" marker-end="url(#qs-arrow)"/>
  <text x="312" y="28" text-anchor="middle" fill="var(--sl-color-gray-2)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11">run payload</text>

  <rect x="336" y="36" width="120" height="56" rx="8" fill="var(--sl-color-bg)" stroke="var(--sl-color-gray-4)" stroke-width="1.5"/>
  <text x="396" y="70" text-anchor="middle" fill="var(--sl-color-white)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="15" font-weight="600">http</text>
  <line x1="456" y1="64" x2="488" y2="64" stroke="var(--sl-color-gray-3)" stroke-width="2" marker-end="url(#qs-arrow)"/>
  <text x="472" y="28" text-anchor="middle" fill="var(--sl-color-gray-2)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11">status, body…</text>

  <rect x="496" y="36" width="120" height="56" rx="8" fill="var(--sl-color-bg)" stroke="var(--sl-color-gray-4)" stroke-width="1.5"/>
  <text x="556" y="70" text-anchor="middle" fill="var(--sl-color-white)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="15" font-weight="600">extract</text>
  <line x1="616" y1="64" x2="648" y2="64" stroke="var(--sl-color-gray-3)" stroke-width="2" marker-end="url(#qs-arrow)"/>
  <text x="680" y="70" text-anchor="middle" fill="var(--sl-color-gray-2)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="12">…</text>

  <text x="360" y="132" text-anchor="middle" fill="var(--sl-color-gray-2)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="12">Each arrow = wire = previous node output (execute input of the next step)</text>
  <text x="360" y="152" text-anchor="middle" fill="var(--sl-color-gray-3)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11">Run panel JSON is also available everywhere as {{input.*}} — with or without an input node</text>
</svg>
<figcaption>Canonical teaching chain: <code>start → input → http → extract</code>. Same shape as <code>demo-main-nodes.flow.json</code>.</figcaption>
</figure>

## Three different “inputs” (read this twice)

| Name | What it is | How you use it |
| --- | --- | --- |
| **Execute input** | JSON the engine passes into `execute()` — always the **previous** node’s output | Not typed in templates. Nodes like `extract` / `assert` / `json` query it with **JMESPath** (`body.id`). |
| **Run input** | Object from the Run panel or CLI `--input` | Templates: `{{input.username}}`. Merge source: `"input"`. |
| **`input` node** | A builtin that **copies** run input onto the wire | Puts the payload where the next node expects previous output. Optional if you only need `{{input.*}}`. |

<figure class="qs-diagram">
<svg viewBox="0 0 720 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="qs-inputs-title qs-inputs-desc">
  <title id="qs-inputs-title">Three meanings of input</title>
  <desc id="qs-inputs-desc">Run input feeds templates and the input node. The input node writes onto the wire. Extract reads previous wire data with JMESPath.</desc>
  <rect x="24" y="20" width="200" height="72" rx="8" fill="var(--sl-color-bg)" stroke="var(--sl-color-accent)" stroke-width="2"/>
  <text x="124" y="48" text-anchor="middle" fill="var(--sl-color-white)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="600">Run input</text>
  <text x="124" y="70" text-anchor="middle" fill="var(--sl-color-gray-2)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11">Run panel / --input</text>

  <path d="M224 56 H270" stroke="var(--sl-color-gray-3)" stroke-width="2" fill="none" marker-end="url(#qs-arrow2)"/>
  <defs>
    <marker id="qs-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>

  <rect x="278" y="20" width="168" height="72" rx="8" fill="var(--sl-color-bg)" stroke="var(--sl-color-gray-4)" stroke-width="1.5"/>
  <text x="362" y="48" text-anchor="middle" fill="var(--sl-color-white)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" font-weight="600">{{input.field}}</text>
  <text x="362" y="70" text-anchor="middle" fill="var(--sl-color-gray-2)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11">any templated field</text>

  <path d="M124 92 V118 H362 V136" stroke="var(--sl-color-gray-3)" stroke-width="2" fill="none" marker-end="url(#qs-arrow2)"/>

  <rect x="278" y="140" width="168" height="56" rx="8" fill="var(--sl-color-bg)" stroke="var(--sl-color-accent)" stroke-width="2"/>
  <text x="362" y="174" text-anchor="middle" fill="var(--sl-color-white)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="600">input node</text>

  <path d="M446 168 H500" stroke="var(--sl-color-gray-3)" stroke-width="2" fill="none" marker-end="url(#qs-arrow2)"/>

  <rect x="508" y="120" width="188" height="96" rx="8" fill="var(--sl-color-bg)" stroke="var(--sl-color-gray-4)" stroke-width="1.5"/>
  <text x="602" y="152" text-anchor="middle" fill="var(--sl-color-white)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" font-weight="600">wire → next node</text>
  <text x="602" y="174" text-anchor="middle" fill="var(--sl-color-gray-2)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11">execute input =</text>
  <text x="602" y="192" text-anchor="middle" fill="var(--sl-color-gray-2)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11">previous output</text>
</svg>
<figcaption><code>{{input.*}}</code> never means “previous node”. The <code>input</code> node is optional plumbing onto the wire.</figcaption>
</figure>

## How a node runs

For each executable node along the edges from [`start`](../nodes/start/):

1. Resolve [templates](../templates/) in that node’s string fields (`{{env…}}`, `{{input…}}`, `{{vars…}}`, `{{nodes…}}`).
2. Call `execute(previousOutput, context)`.
3. Store the return value as `{{nodes.<id>}}` for later nodes.
4. Pass that return value as the next node’s previous/wire data.

[`note`](../nodes/note/) nodes are canvas stickies only — never executed, never on the wire.

## Previous output — wire, templates, and JMESPath

“Previous” is the node **immediately before** this one on the wire (execute input).

| Context | Correct | Common mistake |
| --- | --- | --- |
| [`extract`](../nodes/extract/) / [`json`](../nodes/json/) / [`assert`](../nodes/assert/) | JMESPath `body.id` | `previous.body` (JMESPath root *is* previous) |
| URL / headers / body templates | `{{previous.body.id}}` or `{{nodes.login.body.id}}` | bare `previous.body` without `{{…}}` |
| [`merge`](../nodes/merge/) | `sources: ["previous"]` | Assuming every node has a `sources` field |
| [`template`](../nodes/template/) Eta | `<%= it.previous %>` or mustache `{{previous}}` | Mixing Eta and JMESPath syntax |

<figure class="qs-diagram">
<svg viewBox="0 0 720 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="qs-prev-title qs-prev-desc">
  <title id="qs-prev-title">HTTP then extract</title>
  <desc id="qs-prev-desc">After HTTP, extract uses JMESPath body.title on the previous response. Run fields still use input templates.</desc>
  <defs>
    <marker id="qs-arrow3" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <rect x="40" y="40" width="240" height="120" rx="8" fill="var(--sl-color-bg)" stroke="var(--sl-color-gray-4)" stroke-width="1.5"/>
  <text x="160" y="72" text-anchor="middle" fill="var(--sl-color-white)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="600">http → output</text>
  <text x="160" y="100" text-anchor="middle" fill="var(--sl-color-gray-2)" font-family="ui-monospace, monospace" font-size="12">{ status, body, … }</text>
  <text x="160" y="124" text-anchor="middle" fill="var(--sl-color-gray-3)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11">URL may use {{input.productId}}</text>
  <text x="160" y="144" text-anchor="middle" fill="var(--sl-color-gray-3)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11">Later: {{nodes.fetchProduct.body}}</text>

  <line x1="280" y1="100" x2="330" y2="100" stroke="var(--sl-color-gray-3)" stroke-width="2" marker-end="url(#qs-arrow3)"/>

  <rect x="340" y="40" width="340" height="120" rx="8" fill="var(--sl-color-bg)" stroke="var(--sl-color-accent)" stroke-width="2"/>
  <text x="510" y="72" text-anchor="middle" fill="var(--sl-color-white)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="600">extract expression</text>
  <text x="510" y="104" text-anchor="middle" fill="var(--sl-color-accent-high)" font-family="ui-monospace, monospace" font-size="15" font-weight="600">body.title</text>
  <text x="510" y="132" text-anchor="middle" fill="var(--sl-color-gray-2)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="12">JMESPath over previous — use body.title</text>
  <text x="510" y="152" text-anchor="middle" fill="var(--sl-color-gray-3)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="11">In templates next door: {{previous.body.title}}</text>
</svg>
<figcaption>After <code>http</code>, JMESPath paths start at the response root (<code>body.title</code>). In templated strings you may also write <code>{{previous.body.title}}</code>.</figcaption>
</figure>

## Walkthrough: product fetch

Same idea as `examples/sample-workspace/flows/demo-main-nodes.flow.json`.

| Step | Node | Wire in | What you configure | Wire out |
| --- | --- | --- | --- | --- |
| 1 | `start` | — | — | `{}` |
| 2 | `input` | `{}` | default `value` / Run panel | `{ "productId": "1" }` |
| 3 | `http` | run payload (often unused by http itself) | `url`: `…/products/{{input.productId}}` | `{ status, body, … }` |
| 4 | `extract` | HTTP result | expression `body.title` | `"Essence Mascara…"` (string) |
| 5 | `output` | extracted title (if connected that way) | map with `{{nodes.title}}` | final flow result |

You can skip the `input` node and still write `{{input.productId}}` on the HTTP URL — the node is only required when a later step must receive the payload as **previous** JSON (for example merging or JMESPath over the run object without templates).

## Cheat sheet

| I need… | Use |
| --- | --- |
| Field from Run / `--input` in a string | `{{input.field}}` |
| Field from the immediate previous step | `{{previous.path}}` or extract JMESPath |
| Field from an earlier named node | `{{nodes.login.body.token}}` |
| Env / secret | `{{env.API_BASE}}` / `{{secrets.TOKEN}}` |
| Value written by `set` | `{{vars.key}}` |
| Slice of the last step as a new wire value | `extract` / `json` with JMESPath `body.id` |
| Combine bags | `merge` with `previous`, `input`, `vars`, or node ids |
| Sticky text on the canvas | `note` (not executed) |

## Related

- [Template syntax](../templates/) — scopes and anti-patterns
- [Nodes overview](../nodes/) — execution rules per type
- [input](../nodes/input/) · [extract](../nodes/extract/) · [http](../nodes/http/)
- [Getting started](../getting-started/) — CLI commands for the sample flows
