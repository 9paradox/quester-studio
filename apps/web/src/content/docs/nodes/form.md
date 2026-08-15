---
title: form
description: Mid-flow wait for structured form fields (desktop UI or CLI --forms)
---

Pauses the run until a workspace form is filled and submitted. Output is the submitted field object (`{{nodes.<id>.fieldId}}`). A flow may include **multiple** form nodes (e.g. search → pick → confirm).

Unlike [`input`](../input/), forms are interactive mid-flow wait points. Field defaults and select options can resolve from prior node outputs.

Author forms under `forms/*.form.json` — see [Workspace files](../../workspace/#forms-formjson).

<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="form pause ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="40" cy="62" r="6"/>
  <text class="qs-caption qs-text-below" x="40" y="74" text-anchor="middle">in</text>
  <line class="qs-edge" x1="46" y1="62" x2="118" y2="62"/>
  <rect class="qs-node qs-node-accent" x="118" y="36" width="180" height="52" rx="8"/>
  <text class="qs-label qs-text-aligned" x="196" y="62" text-anchor="middle">form</text>
  <rect class="qs-badge" x="248" y="42" width="42" height="16" rx="4"/>
  <text class="qs-badge-text qs-text-aligned" x="269" y="50" text-anchor="middle">await</text>
  <line class="qs-edge" x1="298" y1="62" x2="370" y2="62"/>
  <circle class="qs-port" cx="376" cy="62" r="6"/>
  <text class="qs-caption qs-text-below" x="376" y="74" text-anchor="middle">out</text>
  <text class="qs-caption qs-text-aligned" x="260" y="118" text-anchor="middle">Pauses until Submit (desktop) or --forms (CLI)</text>
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
