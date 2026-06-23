# configuration Specification

## Purpose

TBD - created by archiving change add-poster-manager. Update Purpose after archive.

## Requirements

### Requirement: Provide and persist runtime configuration

The system SHALL accept runtime configuration — Plex base URL, Plex token, TMDB credential, Kometa assets directory, and default apply method — from environment variables and from the settings UI, and SHALL persist UI-entered values so they survive restarts.

#### Scenario: Configuration from environment

- **WHEN** configuration values are supplied via environment variables at startup
- **THEN** the system uses them as the effective configuration without requiring UI entry

#### Scenario: Configuration from UI persisted

- **WHEN** the user saves configuration in the settings UI
- **THEN** the system persists the values and applies them on the current and subsequent runs

#### Scenario: Environment overrides

- **WHEN** a value is set both in the environment and in persisted settings
- **THEN** the environment value takes precedence and the UI indicates the value is environment-managed

### Requirement: Validate required configuration

The system SHALL validate that required configuration is present and well-formed before running operations that depend on it, and SHALL surface clear errors when it is missing.

#### Scenario: Missing Plex configuration

- **WHEN** a library sync is attempted without a Plex URL or token
- **THEN** the system blocks the operation and reports which configuration is missing

#### Scenario: Missing TMDB credential

- **WHEN** TMDB resolution is attempted without a credential
- **THEN** the system blocks the operation and prompts the user to configure it

### Requirement: Handle secrets safely

The system SHALL treat the Plex token and TMDB credential as secrets: never logging them, and never returning their full value to the client after they are stored.

#### Scenario: Secret not echoed

- **WHEN** the settings view loads after a token has been saved
- **THEN** the system indicates a secret is set without returning the stored secret value to the browser

#### Scenario: Secret not logged

- **WHEN** the system logs requests or errors involving Plex or TMDB
- **THEN** the secret values are redacted from all log output
