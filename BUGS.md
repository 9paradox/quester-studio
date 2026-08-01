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

### B1 — Windows installer shortcuts / DisplayIcon have no Quester icon

| | |
| --- | --- |
| **Severity** | medium |
| **Area** | desktop (NSIS) |
| **Status** | fixed |
| **Issue** | #87 |

NSIS installs `app.ico` and passes it to Desktop/Start Menu shortcuts and Apps & Features `DisplayIcon`. Electrobun also copies `assets/icon.ico` to `Resources/app.ico`.

### B2 — “Open sample” ENOENT on fresh install

| | |
| --- | --- |
| **Severity** | high |
| **Area** | desktop, workspace-service |
| **Status** | fixed |
| **Issue** | #88 |

Sample is synced into the desktop bundle (`Resources/sample-workspace`). Open sample copies to a writable user dir (`%APPDATA%/Quester/sample-workspace` on Windows).

### B3 — Run Response/Logs leak across flow tabs; no success toast

| | |
| --- | --- |
| **Severity** | high |
| **Area** | desktop |
| **Status** | fixed |
| **Issue** | #89 |

Run state is keyed by `flowId` (`runByFlowId`). Response/Logs use the active flow’s slot. Success uses `toast.success`; errors keep `toast.error`.

### BUG-001 — Dedicated `start` node; multi-root flows rejected

| | |
| --- | --- |
| **Severity** | critical |
| **Area** | schema, nodes, engine, desktop, docs |
| **Status** | fixed |

- Builtin `start` node (output only, emits `{}`)
- Exactly one `start`; ≤1 outgoing edge; no incoming edges
- Reachability and execution begin at `start`
- Desktop: scaffold `start → input`, block second start child / delete start / delete start / duplicate start
- Docs updated

---
