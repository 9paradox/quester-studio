---
title: MCP integration
description: Connect Cursor, VS Code, or Claude Desktop to a Quester workspace via MCP
---

Quester exposes a local [Model Context Protocol](https://modelcontextprotocol.io/) **server** so AI agents can list, read, validate, run, and safely edit flows in a folder workspace. The source of truth remains workspace files (`*.flow.json`); the host LLM (Cursor / Claude / VS Code) supplies the brain.

## Start the server

From a built CLI (or monorepo after `bun run build`):

```bash
quester mcp serve --workspace path/to/workspace
```

Or set `QUESTER_WORKSPACE` instead of `--workspace`.

The process speaks MCP over **stdio** (do not write application logs to stdout).

## Desktop activity log

While a workspace is open in Quester Desktop, every MCP tool call against that workspace is appended to `.quester/mcp-activity.jsonl` (gitignored). The bottom panel **MCP** tab tails that feed live (summaries only — no secrets or response bodies).

Mutating tools (`save_flow`, `patch_flow`, `patch_node`) auto-reload the matching flow on the canvas when the tab is clean; dirty tabs prompt accept/discard.

## Tools

| Tool | Purpose |
|------|---------|
| `list_flows` | List flow ids and names |
| `read_flow` | Read flow graph/config (not run bodies) |
| `validate_flow` | Validate by id or raw JSON |
| `run_flow` | Execute; returns step summary + **output shapes** (not raw JSON) |
| `inspect_last_run` | Last run as TS/JSON Schema/paths; `includeValues=true` for redacted samples |
| `save_flow` / `patch_flow` | Write full flow or merge-patch |
| `list_node_types` / `describe_node_type` | Authoring help for node `data` schemas |
| `get_node` / `patch_node` | Collaborate on one node |
| `suggest_jmespath` | Upstream wire shapes + example paths for extract/assert/… |
| `list_env_keys` | Env **keys** only (never values / secrets) |

### Privacy (important)

- Secret **values** and secrets files are never returned.
- Prefer shapes over bodies so the host LLM never sees tokens/PII from HTTP responses.
- `includeValues=true` is opt-in and still redacts `password`, `Authorization`, cookies, etc.

## Editor config examples

`quester` must resolve on PATH, **or** point the host at the monorepo CLI with Bun (recommended while developing from source).

### Cursor (`.cursor/mcp.json`) — from this repo

```json
{
  "mcpServers": {
    "quester": {
      "command": "bun",
      "args": [
        "H:/Projects/quester/quester-studio/packages/cli/dist/cli.js",
        "mcp",
        "serve",
        "--workspace",
        "H:/Projects/quester/quester-studio/examples/sample-workspace"
      ]
    }
  }
}
```

After a global install (`bunx @quester-studio/cli` / npm), you can use `"command": "quester"` and `"args": ["mcp", "serve", "--workspace", "…"]` instead.

### VS Code (`.vscode/mcp.json`)

Same `command` / `args` as Cursor, under `"servers"` (not `"mcpServers"`).

### Claude Desktop

Add under `mcpServers` in the Claude Desktop config (same shape as Cursor).

## Agent authoring pattern

Typical NL loop in the host agent:

1. `list_flows` / `read_flow` — inspect the workspace
2. `inspect_last_run` — see previous node output shapes
3. `patch_flow` or `save_flow` — edit the flow on disk
4. `validate_flow` → `run_flow` — verify

Example: “for each product, assert category is phone” — the agent builds a `foreach` + `assert` flow with tools; Quester does not embed an LLM.

## Calling external MCP tools from a flow

Workspace `settings.mcp.servers` names stdio or HTTP MCP servers. An `mcp` node calls a tool on one of those servers (egress trust: same class as HTTP nodes). See [mcp node](../nodes/mcp/) and [SECURITY.md](https://github.com/9paradox/quester-studio/blob/main/SECURITY.md).

## Trust model (summary)

- Local stdio only in the default setup — the agent runs as your user.
- `run_flow` loads secrets and can make network requests configured in the flow.
- Prefer CLI/desktop workspaces you trust; treat agent-written flows like untrusted code until validated.
