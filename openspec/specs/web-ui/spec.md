# web-ui Specification

## Purpose
TBD - created by archiving change add-poster-manager. Update Purpose after archive.
## Requirements
### Requirement: Library grid with filters and search

The system SHALL present the synced library as a poster grid that can be filtered by media type (movie/show), by poster state (missing poster), and by MediaUX availability (has candidates), and searched by title.

#### Scenario: Filter and search applied

- **WHEN** the user selects filters and/or types a search query
- **THEN** the grid updates to show only items matching the active filters and query, with each item's current poster

#### Scenario: Empty library

- **WHEN** no library has been synced yet
- **THEN** the grid shows an empty state prompting the user to configure Plex and run a sync

### Requirement: Item detail with candidate comparison

The system SHALL provide an item detail view that shows the current poster alongside the discovered MediaUX candidates, lets the user preview and select a candidate, and apply it via the chosen method(s).

#### Scenario: Compare and select

- **WHEN** the user opens an item with discovered candidates
- **THEN** the view displays the current poster and the candidates side by side, and lets the user select one and trigger apply

#### Scenario: No candidates yet

- **WHEN** the user opens an item whose covers have not been discovered
- **THEN** the view offers a "find covers" action that runs discovery for that item

### Requirement: Bulk actions

The system SHALL support selecting multiple items and running discovery and/or apply across the selection as a background job.

#### Scenario: Bulk apply

- **WHEN** the user selects multiple items and chooses bulk apply with automatic selection
- **THEN** the system starts a background job that discovers (if needed), auto-selects, and applies covers for each selected item, with live progress

### Requirement: Jobs view with live progress

The system SHALL provide a jobs view listing active and past jobs with live progress for running jobs and final status for completed ones.

#### Scenario: Live progress shown

- **WHEN** a job is running and the user opens the jobs view
- **THEN** the view shows a live progress indicator that updates without a manual refresh

### Requirement: Settings view

The system SHALL provide a settings view to enter and test the Plex URL/token, TMDB credential, Kometa assets directory, and default apply method.

#### Scenario: Settings saved and validated

- **WHEN** the user enters configuration in settings and saves
- **THEN** the system validates connectivity (Plex and TMDB) and persists the configuration, reporting any validation failure inline

