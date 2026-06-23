## Why

PosterPilot is a clean, self-hosted app that others would benefit from running and contributing to. To release it publicly under `github.com/diegopeixoto/posterpilot`, the repository needs the standard open-source scaffolding — a license, contribution and conduct guidelines, a security policy, contribution templates, and CI that enforces the project's existing quality gates — so external contributors can use it and submit changes with confidence.

## What Changes

- **Adopt the MIT license** — add a `LICENSE` file naming the copyright holder, and reference it from the README.
- **Add contribution guidance** — `CONTRIBUTING.md` (dev setup, the `bun run check` / `test` / `format` gates, branch/PR expectations) and a `CODE_OF_CONDUCT.md`.
- **Add a security policy** — `SECURITY.md` describing how to privately report vulnerabilities.
- **Add GitHub templates** — issue templates (bug report, feature request) and a pull-request template under `.github/`.
- **Add CI** — a GitHub Actions workflow that runs `bun run check`, `bun run test`, and `bun run format`-check on pull requests and pushes.
- **Add funding metadata** — `.github/FUNDING.yml` with sponsor links.
- **Polish the README for a public audience** — badges (license, CI), a screenshot/feature section, and a clear quickstart, building on the existing content.

## Capabilities

### New Capabilities

- `open-source`: Repository-level requirements for a public open-source release — license, contribution/conduct/security docs, contribution templates, and CI quality gates.

### Modified Capabilities

<!-- None — this change adds repository governance/process, not runtime behavior. -->

## Impact

- **New files:** `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `.github/ISSUE_TEMPLATE/*`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/workflows/ci.yml`, `.github/FUNDING.yml`.
- **Modified files:** `README.md` (badges, screenshots, quickstart, license reference).
- **No application code or runtime behavior changes.**
- **CI:** introduces a required-checks pipeline on GitHub using the existing Bun scripts.
