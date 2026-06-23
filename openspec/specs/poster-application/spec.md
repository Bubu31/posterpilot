# poster-application Specification

## Purpose
TBD - created by archiving change add-poster-manager. Update Purpose after archive.
## Requirements
### Requirement: Select a candidate cover

The system SHALL let a user choose one candidate cover for an item from the discovered MediaUX candidates, and SHALL support an automatic selection that picks the newest set's primary poster.

#### Scenario: Manual selection

- **WHEN** the user picks a specific candidate for an item
- **THEN** the system records that candidate as the pending selection for the item

#### Scenario: Automatic selection

- **WHEN** the user requests automatic selection for an item or a bulk set of items
- **THEN** the system selects the primary poster from the newest available set for each item

### Requirement: Apply a selected cover via one or both methods

The system SHALL apply a selected cover using the method(s) chosen by the user: direct Plex upload, Kometa YAML export, or both. The method SHALL be selectable per apply action with a configurable default.

#### Scenario: Direct apply only

- **WHEN** the user applies a selection with the direct method
- **THEN** the system uploads the poster through the Plex integration, locks the field, and records the application as method "plex"

#### Scenario: Kometa export only

- **WHEN** the user applies a selection with the Kometa method
- **THEN** the system writes or updates Kometa-compatible YAML for the item without contacting Plex, and records the application as method "kometa"

#### Scenario: Both methods

- **WHEN** the user applies a selection with both methods
- **THEN** the system performs the Plex upload and writes the Kometa YAML, and records both outcomes independently so a partial failure is visible

### Requirement: Export Kometa-compatible YAML

The system SHALL generate Kometa/PMM-compatible metadata YAML containing `url_poster` (and `url_background` when a background is selected) keyed so Kometa applies it to the correct item, and SHALL write it into the configured Kometa assets/config directory.

#### Scenario: YAML written to mounted directory

- **WHEN** a Kometa export runs for one or more items
- **THEN** the system writes valid YAML entries pointing at the selected MediaUX asset URLs into the configured directory, ready for the next Kometa run

#### Scenario: Re-export updates existing entry

- **WHEN** a Kometa export runs again for an item that already has an entry
- **THEN** the system updates that item's entry in place rather than creating a duplicate

### Requirement: Record applied posters

The system SHALL record every applied cover with the item, the asset URL, the method(s) used, the outcome, and a timestamp, so history is queryable and re-application is detectable.

#### Scenario: Application recorded

- **WHEN** an apply action completes (success or failure)
- **THEN** the system stores a history record with item, URL, method, status, and timestamp

