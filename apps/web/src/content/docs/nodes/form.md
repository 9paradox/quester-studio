---
title: form
description: Mid-flow wait for structured form fields (desktop UI or CLI --forms)
---

Pauses the run until a workspace form is filled and submitted. Output is the submitted field object (`{{nodes.<id>.fieldId}}`). A flow may include **multiple** form nodes (e.g. search → pick → confirm).

Unlike [`input`](../input/), forms are interactive mid-flow wait points. Field defaults and select options can resolve from prior node outputs.

Author forms under `forms/*.form.json` — see [Workspace files](../../workspace/#forms-formjson).

## Data

| Field | Type | Description |
| --- | --- | --- |
| `formId` | string | Workspace form id (`forms/{formId}.form.json`) |
| `label` | string | Optional UI label |
| `value` | object | Optional draft / prefill overrides (field id → value; strings may be templates) |

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
