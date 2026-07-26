# Changelog

All notable changes are documented here. Versions follow [Semantic Versioning](https://semver.org/).

Releases use [Changesets](https://github.com/changesets/changesets). After `changeset version`, this file is updated automatically.

## Unreleased

### Added

- Governance foundation: CI gates (lint, typecheck, audit), contributor docs, pre-commit hooks
- Security hardening: desktop secrets loading, HTTP URL validation
- Changesets release workflow for `@quester-studio/*` npm packages
- Roadmap and feature planning workflow

## 0.1.0

### Added

- Initial Quester Studio monorepo
- `@quester-studio/schema`, `@quester-studio/nodes`, `@quester-studio/engine`, `@quester-studio/cli`
- Sample workspace and CLI `validate` / `run` commands
- Desktop app stub with React Flow canvas
