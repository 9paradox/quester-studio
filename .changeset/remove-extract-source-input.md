---
"@quester/schema": patch
"@quester/nodes": patch
"@quester/desktop": patch
---

Remove extract/json `source: "input"` — both always read the previous node; use `{{input.*}}` for run payload.
