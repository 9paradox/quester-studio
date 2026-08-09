---
"@quester-studio/schema": patch
"@quester-studio/engine": patch
"@quester-studio/desktop": patch
---

Allow nesting `try` / `foreach` frames on the canvas (deepest-frame drop target). Nested frames wire parent `entry`→child `in` and child `success`/`complete`→parent `exit`. Template lint recognizes `{{item}}`/`{{index}}` inside nested foreach bodies.
