## Context

PosterPilot currently has no license, contribution docs, or CI. It uses Bun with `package.json` scripts `check` (svelte-check), `test` (vitest), and `format` (prettier). The release target is `github.com/diegopeixoto/posterpilot`, maintained by Diego Peixoto. This change adds repository governance and automation only — no application code changes.

## Goals / Non-Goals

**Goals:**

- Make the repo safe and inviting to use and contribute to: clear license, contribution path, conduct and security policies, templates, and enforced quality gates.
- Reuse the existing Bun scripts as the single source of truth for CI checks.

**Non-Goals:**

- No application/runtime changes.
- No release automation (changelogs, tagged releases, container publishing) — can follow later.
- No multi-maintainer governance model.

## Decisions

**1. MIT license.** Permissive, lowest-friction for a self-hosted tool; maximizes adoption and contribution. _Alternatives:_ Apache-2.0 (extra patent/NOTICE ceremony) or GPL-3.0 (copyleft deters some use) — rejected for this project's goals.

**2. CI mirrors local gates exactly.** The GitHub Actions workflow installs Bun, runs `bun install`, then `bun run check`, `bun run test`, and a prettier format check (`bun run format` in check mode / `lint`). Keeping CI identical to the documented local commands avoids drift between what contributors run and what CI enforces. _Alternative:_ a bespoke CI script (rejected — duplicates the scripts and drifts).

**3. Standard GitHub community files in conventional locations.** `.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/FUNDING.yml`, and root-level `LICENSE` / `CONTRIBUTING.md` / `CODE_OF_CONDUCT.md` / `SECURITY.md` so GitHub surfaces them automatically (Sponsor button, "New issue" chooser, community-standards checklist).

**4. Conduct = Contributor Covenant; Security = private reporting.** Use the widely-recognized Contributor Covenant for conduct and direct vulnerability reports to a private contact (GitHub private advisory / maintainer email) rather than public issues.

## Risks / Trade-offs

- **CI flakiness or Bun version drift** → Pin the Bun version in the workflow and use the format-check (non-writing) mode so CI is deterministic.
- **Format check failing on existing files** → Run `bun run format` once before enabling the gate so the baseline is clean.
- **License copyright holder accuracy** → Name "Diego Peixoto" and the current year in `LICENSE`.

## Migration Plan

1. Run `bun run format` to normalize the existing tree so the new format gate passes.
2. Add the community files and CI workflow.
3. Push to the public repo; enable branch protection requiring the CI check (maintainer action on GitHub).
4. Rollback: remove the workflow file / community files; no runtime impact.

## Open Questions

- Funding platforms to list in `FUNDING.yml` (GitHub Sponsors, Ko-fi, etc.) — confirm with the maintainer.
- Security reporting channel: GitHub private vulnerability reporting vs a published email — confirm preference.
