# Security Policy

## Reporting a vulnerability

Please report security issues **privately** via [GitHub Security Advisories](https://github.com/9paradox/quester-studio/security/advisories/new).

Do not open public issues for undisclosed vulnerabilities.

We aim to acknowledge reports within 7 days and provide a fix or mitigation plan as soon as practical.

## Secrets handling

- Workspace secrets live in `environments/<env>.secrets.json` — **gitignored**.
- Use `*.secrets.json.example` templates for documentation; never commit real values.
- Do not commit `.env`, API tokens, or credentials.

Quester does not encrypt secrets at rest. Protect workspace directories with OS-level permissions.

## Flow execution trust model

- **HTTP nodes** can request any `http:` or `https:` URL after template resolution.
- Quester does **not** sandbox network egress. Users are responsible for URLs their flows call.
- Flows run with the privileges of the user running the CLI or desktop app.

## Desktop downloads

Desktop release artifacts are **unsigned development builds**. Verify checksums published on GitHub Releases before running. See your platform documentation for running unsigned applications safely.

## Supported versions

| Version | Supported |
|---------|-----------|
| latest release | Yes |
| older releases | Best effort |

Security fixes are released via semver patch versions using Changesets.
