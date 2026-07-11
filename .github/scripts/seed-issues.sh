#!/usr/bin/env bash
# Seed roadmap backlog issues. Requires: gh auth login
set -euo pipefail

create_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  local milestone="$4"
  gh issue create --title "$title" --body "$body" --label "$labels" --milestone "$milestone"
}

# Milestones (create if missing)
for m in "v0.2.0" "v0.3.0" "v0.4.0"; do
  gh api repos/:owner/:repo/milestones -f title="$m" -f state=open 2>/dev/null || true
done

create_issue \
  "Desktop: Electrobun IPC for main-process RPCs" \
  "Expose openWorkspace, listFlows, executeFlowRpc to renderer via Electrobun RPC.\n\nSee .cursor/skills/quester-desktop/SKILL.md" \
  "type:feature,area:desktop,priority:high" \
  "v0.2.0"

create_issue \
  "Desktop: workspace folder picker" \
  "Let users open a folder containing quester.json instead of hardcoded sample workspace." \
  "type:feature,area:desktop,priority:high" \
  "v0.2.0"

create_issue \
  "Desktop: flow list and canvas loader" \
  "Load selected *.flow.json into React Flow canvas from workspace." \
  "type:feature,area:desktop,priority:high" \
  "v0.2.0"

create_issue \
  "Desktop: run panel with env and output" \
  "Env selector, JSON input, executeFlowRpc, display flow output and events." \
  "type:feature,area:desktop,priority:high" \
  "v0.2.0"

create_issue \
  "Desktop: custom React Flow nodeTypes" \
  "Register per-type node components for http, input, if, etc." \
  "type:feature,area:desktop,priority:medium" \
  "v0.3.0"

create_issue \
  "Desktop: node inspector for data fields" \
  "Edit node data inline in the builder UI." \
  "type:feature,area:desktop,priority:medium" \
  "v0.3.0"

create_issue \
  "CLI: quester init workspace scaffold" \
  "Add quester init command to create quester.json, flows/, environments/." \
  "type:feature,area:cli,priority:medium" \
  "v0.4.0"

echo "Issues seeded. Update ROADMAP.md with issue numbers."
