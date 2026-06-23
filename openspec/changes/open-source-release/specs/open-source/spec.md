## ADDED Requirements

### Requirement: MIT license

The repository SHALL include an MIT `LICENSE` file naming the copyright holder, and the README SHALL state that the project is MIT-licensed.

#### Scenario: License present

- **WHEN** a visitor opens the repository
- **THEN** a `LICENSE` file containing the MIT license text and copyright holder is present and GitHub detects the project as MIT-licensed

#### Scenario: README references the license

- **WHEN** a visitor reads the README
- **THEN** the README states the project is released under the MIT license and links to `LICENSE`

### Requirement: Contribution and conduct guidance

The repository SHALL include a `CONTRIBUTING.md` that documents local setup and the required quality gates (`bun run check`, `bun run test`, `bun run format`) and pull-request expectations, and a `CODE_OF_CONDUCT.md`.

#### Scenario: Contributing guide present

- **WHEN** a prospective contributor opens `CONTRIBUTING.md`
- **THEN** it explains how to set up the project locally, which checks must pass before a PR, and how to submit changes

#### Scenario: Code of conduct present

- **WHEN** a visitor opens `CODE_OF_CONDUCT.md`
- **THEN** a code of conduct with a reporting contact is present

### Requirement: Security policy

The repository SHALL include a `SECURITY.md` describing how to privately report a vulnerability.

#### Scenario: Security policy present

- **WHEN** a reporter opens `SECURITY.md`
- **THEN** it describes a private channel and process for reporting vulnerabilities

### Requirement: Contribution templates

The repository SHALL provide GitHub issue templates for bug reports and feature requests and a pull-request template under `.github/`.

#### Scenario: Issue templates offered

- **WHEN** a user opens a new issue on GitHub
- **THEN** they are offered a bug-report template and a feature-request template

#### Scenario: PR template applied

- **WHEN** a contributor opens a pull request
- **THEN** the PR description is prefilled from the repository's pull-request template

### Requirement: Continuous integration gates

The repository SHALL run an automated CI workflow on pull requests and pushes that executes the project's type-check, tests, and format check, so regressions are caught before merge.

#### Scenario: CI runs on a pull request

- **WHEN** a pull request is opened or updated
- **THEN** CI runs `bun run check`, `bun run test`, and the format check, and reports pass/fail as a status check

#### Scenario: Failing checks block visibility

- **WHEN** any of the type-check, tests, or format check fails
- **THEN** the CI run is marked failed for that pull request

### Requirement: Funding metadata

The repository SHALL include a `.github/FUNDING.yml` with the maintainer's sponsor links.

#### Scenario: Funding configured

- **WHEN** a visitor views the repository on GitHub
- **THEN** a Sponsor option is shown, sourced from `.github/FUNDING.yml`
