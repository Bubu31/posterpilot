# poster-application Specification

## Purpose

TBD - created by archiving change add-poster-manager. Update Purpose after archive.
## Requirements
### Requirement: Select a candidate cover

The system SHALL let a user stage a pending selection for an item consisting of a poster and/or a background chosen from the discovered MediaUX candidates. The user SHALL be able to stage both pieces of one set at once ("use this set") or take an individual poster or background from any set. The system SHALL support an automatic selection that picks the newest set's primary poster.

#### Scenario: Manual selection

- **WHEN** the user picks a specific poster or background candidate for an item
- **THEN** the system records that candidate as the corresponding pending selection (poster or background) for the item

#### Scenario: Stage a whole set

- **WHEN** the user chooses "use this set" on a set that has both a poster and a backdrop
- **THEN** the system stages that set's poster and backdrop together as the item's pending selection

#### Scenario: Mix pieces across sets

- **WHEN** the user stages a poster from one set and a backdrop from a different set
- **THEN** the system keeps both as the item's pending selection independently of which set each came from

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

### Requirement: Apply a custom cover

The system SHALL let a user supply a custom cover for an item outside the discovered candidates, either by pasting an image URL or by uploading an image file. A URL-based custom cover SHALL be applicable via both Plex and Kometa; an uploaded file SHALL be applicable via Plex only, because a binary upload cannot be expressed as a Kometa YAML URL.

#### Scenario: Custom URL staged

- **WHEN** the user enters an image URL for the poster or background slot
- **THEN** the system stages that URL as the pending selection and allows applying it through Plex and/or Kometa

#### Scenario: Uploaded file applied to Plex

- **WHEN** the user uploads an image file for an item
- **THEN** the system uploads it directly to Plex and records the application as method "plex"

#### Scenario: Uploaded file not exportable to Kometa

- **WHEN** the user has staged an uploaded file (not a URL) and selects a method that includes Kometa
- **THEN** the system applies the upload to Plex and omits it from Kometa export, making the limitation visible rather than writing an invalid YAML entry

