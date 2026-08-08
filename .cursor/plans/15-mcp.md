# Plan 15 — MCP integration

**Priority:** 15 (later)  
**Status:** after polish track  
**ROADMAP:** §8 MCP integration  

## Goal

Expose Quester to agents via a local MCP **server** (Cursor / VS Code / Claude Desktop), with the same tools usable from CLI and desktop. Later: call external MCP tools from flows (**client**). Local-first trust boundaries.

## Out of scope

- Hosted multi-tenant MCP gateway (SaaS Later)
- Embedding an LLM inside Quester for NL→flow (host agent does that; pairs with plan 14 “generate/edit” later)
- Remote-controlling React Flow over MCP (select/drag nodes on a live canvas instance) in v1

## Dependencies

Stable validate/run APIs; `security-review` for tool surface; SECURITY notes if anything beyond stdio is exposed.

## Approach

**Shared capabilities, two thin hosts**

- Shared tool/handler core (prefer small `@quester-studio/mcp` or equivalent) calling engine — not protocol in engine, not a desktop-only fork
- **CLI** `quester mcp serve` — primary stdio entry for agents
- **Desktop** — same tools; discovery/config + “AI following” UX; optional spawn/`serve` lifecycle

**Hybrid control model**

- Source of truth = workspace files (`*.flow.json`, etc.)
- Agent reads/writes/runs via MCP; desktop reloads and shows that the canvas is following agent activity
- Defer live in-memory canvas RPC until file-based edit + reload feels solid

**NL example** (“foreach product, assert category is phone”): host LLM in Cursor/Claude uses tools to inspect last node / flow, patch flow, validate, run — Quester supplies context + mutators, not the brain.

## Work

### Stage 1 — MCP server (read + run)

- [ ] Shared tool handlers + stdio server wiring (reusable from CLI / desktop)
- [ ] Tools: list flows, scoped workspace/flow read, validate, run flow
- [ ] Tool: inspect last run / node outputs (enough for agent to “see” previous step shape)
- [ ] CLI: `quester mcp serve` (workspace-scoped)
- [ ] Sample + docs: connect Cursor / VS Code / Claude to a CLI workspace; run a sample flow
- [ ] Trust notes: workspace path scoping; `run` can hit network / use secrets

### Stage 2 — Agent authoring (write)

- [ ] Safe write / patch flow tools (validate before/after write; no path escape)
- [ ] Docs/examples: agent builds a small foreach + assert style flow from NL in the host
- [ ] CLI workspace remains first-class (no desktop required)

### Stage 3 — Desktop discovery + “AI following” UX

- [ ] Copy / configure MCP snippet for current workspace (points at CLI serve or embedded same core)
- [ ] Reload / sync canvas when flow files change under agent edits
- [ ] Banner / mode: canvas controlled by AI / updating automatically; optional edit lock or accept/discard
- [ ] Highlight last-touched or running nodes when agent-driven run streams (reuse run UX patterns)

### Stage 4 — MCP client (flows → external tools)

- [ ] Call MCP tools from a flow or dedicated node (`add-flow-node` if new type)
- [ ] Desktop / CLI config for client endpoints
- [ ] Docs + trust boundaries for egress to third-party MCP servers

### Later (not blocking Stage 1–3)

- [ ] Attach MCP session to an open desktop window (richer streaming vs disk-only)
- [ ] Live canvas control API over MCP (if hybrid file model proves insufficient)

## Done when

A local agent (Cursor / Claude / VS Code) can list, inspect, validate, and run a sample flow via MCP against a folder workspace; optional Stage 2 write + Stage 3 desktop “AI following” when those ship; docs describe the trust model. MCP client (Stage 4) can land in a follow-up.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify (per shipped stage):

- [ ] **X** — Stage 1: agent via `quester mcp serve` can list, validate, and run a sample flow; inspect last run/node outputs.
- [ ] **Y** — Stage 2 (if shipped): agent can patch a flow safely (no path escape); validate/run still works from CLI workspace alone.
- [ ] **Z** — Stage 3/4 (if shipped): desktop MCP config / “AI following” reloads canvas on file edits; client egress boundaries match SECURITY/docs.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`quester-studio`, `quester-desktop` (Stage 3), `security-review`, optionally `add-flow-node` (Stage 4)
