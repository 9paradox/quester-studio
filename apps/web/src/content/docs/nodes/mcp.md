---
title: mcp
description: Call a tool on an external MCP server configured in the workspace
---

Invokes a tool on a named MCP server from workspace `settings.mcp.servers`. Treat like [HTTP](../http/) egress: arguments and results may leave the process.

Configure servers in `quester.json`:

```json
{
  "settings": {
    "mcp": {
      "servers": {
        "local": {
          "transport": "stdio",
          "command": "npx",
          "args": ["-y", "some-mcp-server"]
        },
        "remote": {
          "transport": "http",
          "url": "http://127.0.0.1:3100/mcp"
        }
      }
    }
  }
}
```

See [MCP integration](../../mcp/) and [SECURITY.md](https://github.com/9paradox/quester-studio/blob/main/SECURITY.md).

<!-- qs-ports:start -->
<figure class="qs-diagram">
<svg class="qs-svg" viewBox="0 0 520 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="mcp ports">
<defs>
  <marker id="qs-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
    <path d="M0,0 L8,4 L0,8 Z" fill="var(--qs-faint)"/>
  </marker>
</defs>
  <circle class="qs-port" cx="48" cy="70" r="6"/>
  <text class="qs-caption" x="48" y="100" text-anchor="middle">in ×1</text>
  <line class="qs-edge" x1="54" y1="70" x2="150" y2="70"/>
  <rect class="qs-node qs-node-accent" x="150" y="40" width="200" height="60" rx="8"/>
  <text class="qs-label" x="250" y="75" text-anchor="middle">mcp</text>
  <line class="qs-edge" x1="350" y1="70" x2="446" y2="70"/>
  <circle class="qs-port" cx="452" cy="70" r="6"/>
  <text class="qs-caption" x="452" y="100" text-anchor="middle">out ×1</text>
</svg>
<figcaption>Calls an external MCP tool; output is the tool result.</figcaption>
</figure>
<!-- qs-ports:end -->

## Data

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Optional UI label |
| `server` | string | Server id from `settings.mcp.servers` (templates ok) |
| `tool` | string | Remote tool name (templates ok) |
| `arguments` | object \| string | Tool args; string is JSON after template resolve |
| `timeoutMs` | number | Optional timeout (default 60000) |

## Input / output

| | Value |
| --- | --- |
| Input | Previous node (use templates to reference it) |
| Output | MCP `tools/call` result object |
