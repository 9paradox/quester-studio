---
"@quester-studio/schema": minor
"@quester-studio/engine": minor
"@quester-studio/nodes": minor
"@quester-studio/desktop": minor
---

Breaking: framed `try` / `foreach` containers with `parentId`, entry/exit edges, and outer `success`/`failed` / `complete` handles. Soft-try and map-only foreach are rejected; soft branching stays on `if`.
