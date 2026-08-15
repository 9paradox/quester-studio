---
title: form
description: Mid-flow wait for structured form fields (desktop UI or CLI --forms)
---

Pauses the run until a workspace form is filled and submitted. Output is the submitted field object (`{{nodes.<id>.fieldId}}`). A flow may include **multiple** form nodes (e.g. search → pick → confirm).

Unlike [`input`](../input/), forms are interactive mid-flow wait points. Field defaults and select options can resolve from prior node outputs.

Author forms under `forms/*.form.json` — see [Workspace files](../../workspace/#forms-formjson).


<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 560 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="form pause ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="130" y2="70"/>
  <rect class="qs-node qs-node-accent" x="130" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="230" y="75" text-anchor="middle">form</text>
  <rect class="qs-badge" x="168" y="48" width="52" height="18" rx="4"/>
  <text class="qs-badge-text" x="194" y="60" text-anchor="middle">await</text>
  <line class="qs-edge" x1="330" y1="70" x2="406" y2="70"/>
  <circle class="qs-port" cx="412" cy="70" r="6"/>
  <text class="qs-caption" x="412" y="100" text-anchor="middle">out ×1</text>
  <text class="qs-caption" x="280" y="138" text-anchor="middle">Run pauses until Submit (desktop) or --forms map (CLI)</text>
</svg>
<figcaption>Pauses until submit (desktop UI or CLI --forms). Output is the submitted field object.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Description |
| --- | --- | --- |
| `formId` | string | Workspace form id (`forms/{formId}.form.json`) |
| `label` | string | Optional UI label |
| `bindings` | object | Optional map of form **input** id → value/template (resolved before field defaults; available as `{{form.*}}` inside the form) |
| `value` | object | Optional draft / prefill overrides (field id → value; strings may be templates) |

## Reusable inputs and bindings

Forms may declare **`inputs`** (reusable parameters) separate from visible **`fields`**. Each flow’s [`form`](./form/) node binds those inputs via **`bindings`** so the same form file works in different flows:

```json
{
  "id": "pickForm",
  "type": "form",
  "data": {
    "formId": "pick-product",
    "bindings": {
      "products": "{{nodes.search.body.products}}"
    }
  }
}
```

Inside the form definition, reference bound values with `{{form.products}}` in field defaults or `optionsFrom.items`. After submit, read answers with `{{nodes.pickForm.productId}}`.

## Desktop vs CLI

| Host | Behavior |
| --- | --- |
| Desktop | Shows resolved fields; Submit resumes; Stop cancels |
| CLI | `--forms <file.json>` map keyed by **form node id**; missing key fails the node |

```bash
quester run search-pick-cart --workspace . --env local \
  --forms ./forms/search-pick-cart.forms.json
```

## Related

- [Workspace forms](../../workspace/#forms-formjson)
- [input](../input/) — initial run payload (not mid-flow wait)
- Sample: `examples/sample-workspace/flows/search-pick-cart.flow.json`
- Full tour: `examples/sample-workspace/flows/forms-showcase.flow.json` (all field types + multi-form await)
