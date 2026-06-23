## 1. License

- [ ] 1.1 Add MIT `LICENSE` naming "Diego Peixoto" and the current year
- [ ] 1.2 Reference the MIT license in `README.md` with a link to `LICENSE`

## 2. Community docs

- [ ] 2.1 Add `CONTRIBUTING.md`: local setup (bun install, env, db:generate, dev), required gates (`bun run check` / `test` / `format`), branch + PR expectations
- [ ] 2.2 Add `CODE_OF_CONDUCT.md` (Contributor Covenant) with a reporting contact
- [ ] 2.3 Add `SECURITY.md` describing the private vulnerability-reporting process

## 3. GitHub templates

- [ ] 3.1 Add `.github/ISSUE_TEMPLATE/bug_report.md` (or `.yml`)
- [ ] 3.2 Add `.github/ISSUE_TEMPLATE/feature_request.md` (or `.yml`)
- [ ] 3.3 Add `.github/ISSUE_TEMPLATE/config.yml` if disabling blank issues / adding links
- [ ] 3.4 Add `.github/PULL_REQUEST_TEMPLATE.md`

## 4. CI

- [ ] 4.1 Add `.github/workflows/ci.yml`: checkout, setup Bun (pinned version), `bun install`, `bun run check`, `bun run test`, prettier format check — on `pull_request` and pushes to `main`
- [ ] 4.2 Run `bun run format` once to normalize the tree so the format gate passes from a clean baseline
- [ ] 4.3 Verify the workflow passes (locally run the same commands; confirm green after push)

## 5. Funding & README polish

- [ ] 5.1 Add `.github/FUNDING.yml` with the maintainer's sponsor links
- [ ] 5.2 Add README badges (license, CI status) and a screenshot/feature section
- [ ] 5.3 Tighten the README quickstart for a first-time external user

## 6. Verification

- [ ] 6.1 `openspec validate open-source-release` passes
- [ ] 6.2 GitHub community-standards checklist shows license, contributing, conduct, security, and templates detected
