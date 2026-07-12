# Bug tracker

Living list of known bugs and correctness issues. Prefer a GitHub Issue with `type:bug` when work starts; keep this file for quick triage.

| Severity | Meaning |
| --- | --- |
| **critical** | Wrong or unsafe execution; block release / fix ASAP |
| **high** | Major broken UX or data; next milestone |
| **medium** | Incorrect behavior with workaround |
| **low** | Polish, edge cases |

---

## Open

_None._

---

## Fixed

### BUG-001 — Dedicated `start` node; multi-root flows rejected

| | |
| --- | --- |
| **Severity** | critical |
| **Area** | schema, nodes, engine, desktop, docs |
| **Status** | fixed |

- Builtin `start` node (output only, emits `{}`)
- Exactly one `start`; ≤1 outgoing edge; no incoming edges
- Reachability and execution begin at `start`
- Desktop: scaffold `start → input`, block second start child / delete start / duplicate start
- Docs updated

---
