---
"@quester-studio/schema": patch
"@quester-studio/nodes": patch
"@quester-studio/desktop": patch
---

Remove extract/json `source: "input"` — both always read the previous node; use `{{input.*}}` for run payload.
