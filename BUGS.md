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

### B1 — Windows installer shortcuts / DisplayIcon have no Quester icon

| | |
| --- | --- |
| **Severity** | medium |
| **Area** | desktop (NSIS) |
| **Status** | open |
| **Issue** | #87 |

NSIS creates Desktop and Start Menu shortcuts pointing at `launcher.exe` with no icon file argument, and Apps & Features `DisplayIcon` also uses `launcher.exe`. `assets/icon.ico` is only wired for the setup wizard (`MUI_ICON`), so Explorer shows a blank/generic icon after install.

**Fix direction:** install `icon.ico` into `$INSTDIR`; pass it to `CreateShortcut` and `DisplayIcon`. Optional: embed into `launcher.exe` via `rcedit` for portable zips.

### B2 — “Open sample” ENOENT on fresh install

| | |
| --- | --- |
| **Severity** | high |
| **Area** | desktop, workspace-service |
| **Status** | open |
| **Issue** | #88 |

Welcome → Open sample uses `resolveDefaultWorkspaceRoot()`, which walks for `examples/sample-workspace` from `cwd` / `import.meta.url`. That only works in the monorepo. Release builds do not copy the sample into the app bundle, so packaged installs fail (e.g. nonsense paths like `C:\Users\examples\sample-workspace\quester.json`).

**Fix direction:** ship sample under app Resources; resolve packaged path; on Open sample copy to a writable user dir (`%APPDATA%/Quester/sample-workspace` on Windows).

### B3 — Run Response/Logs leak across flow tabs; no success toast

| | |
| --- | --- |
| **Severity** | high |
| **Area** | desktop |
| **Status** | open |
| **Issue** | #89 |

`runResult`, `runError`, `isRunning`, `nodeStatuses`, and related fields are a single global set on the store. Switching flow tabs does not swap run state, so flow B shows flow A’s Response/Logs. Errors toast; success only logs “Run finished” with no `toast.success`.

**Fix direction:** key run state by `flowId`; Response/Logs/selectors use the active flow; toast on pass and fail.

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
