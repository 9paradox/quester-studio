#!/usr/bin/env bash
# Seed GitHub issue labels. Requires: gh auth login
set -euo pipefail

labels=(
  "type:feature:0E8A16:New capability"
  "type:bug:D73A4A:Defect"
  "type:chore:6E7781:Tooling and hygiene"
  "type:docs:0075CA:Documentation"
  "type:security:E99695:Security hardening"
  "area:schema:C5DEF5:@quester/schema"
  "area:nodes:C5DEF5:@quester/nodes"
  "area:engine:C5DEF5:@quester/engine"
  "area:cli:C5DEF5:@quester/cli"
  "area:desktop:C5DEF5:Desktop app"
  "area:docs:C5DEF5:Docs and web"
  "area:infra:C5DEF5:CI release hooks"
  "priority:high:B60205:Current milestone"
  "priority:medium:FBCA04:Next milestone"
  "priority:low:0E8A16:Backlog"
  "good first issue:7057FF:Onboarding friendly"
  "blocked:000000:Blocked"
)

for entry in "${labels[@]}"; do
  IFS=: read -r name color description <<< "$entry"
  gh label create "$name" --color "${color}" --description "$description" --force 2>/dev/null || \
    gh label create "$name" --color "${color}" --description "$description" --force
done

echo "Labels seeded."
