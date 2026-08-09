---
"@quester-studio/schema": minor
"@quester-studio/engine": minor
"@quester-studio/nodes": minor
"@quester-studio/desktop": minor
---

Enforce at most one incoming edge for ordinary nodes (docs `in ×1`). New `join` node accepts N inputs and emits a collect-map of predecessor outputs for diamonds and post-branch reconvergence. Frame auto-wiring no longer adds redundant entry edges.
