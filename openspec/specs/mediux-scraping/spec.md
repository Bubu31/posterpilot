# mediux-scraping Specification

## Purpose
TBD - created by archiving change add-poster-manager. Update Purpose after archive.
## Requirements
### Requirement: Discover MediaUX sets for a TMDB ID

The system SHALL fetch the MediaUX page for a TMDB ID (using the movie or show path based on media type) and extract the list of artwork set links, ordered newest-first.

#### Scenario: Sets found

- **WHEN** the system requests covers for a resolved TMDB ID
- **THEN** it fetches the corresponding mediux.pro page, extracts the set links, and returns them ordered newest-first

#### Scenario: No sets available

- **WHEN** the MediaUX page contains no sets for the TMDB ID
- **THEN** the system returns an empty candidate list and marks the item as having no MediaUX artwork

### Requirement: Extract poster candidates from a set

The system SHALL load each set and extract its artwork from the embedded page data, producing candidate entries that include the asset URL and the kind (poster, background, season poster, or episode title card) with season/episode numbers where applicable.

#### Scenario: Candidates extracted

- **WHEN** a set page is loaded
- **THEN** the system parses the embedded JSON payload and returns poster and background candidates with absolute asset URLs and their kind

#### Scenario: Page structure changed

- **WHEN** the embedded payload cannot be parsed in the expected shape
- **THEN** the system records a parse failure for that set, skips it, and continues with the remaining sets rather than aborting the whole item

### Requirement: Throttle, retry, and cache MediaUX requests

The system SHALL rate-limit outbound MediaUX requests with a configurable delay and concurrency cap, retry transient failures with backoff, and cache fetched responses to avoid redundant network calls.

#### Scenario: Rate limiting and concurrency

- **WHEN** the system scrapes many items concurrently
- **THEN** it bounds concurrency to the configured cap and applies the configured per-request delay so the source is not overloaded

#### Scenario: Transient failure retried

- **WHEN** a MediaUX request fails with a transient error (timeout or 5xx)
- **THEN** the system retries with backoff up to the configured maximum before recording the item as failed

#### Scenario: Cached response reused

- **WHEN** a MediaUX URL was fetched within the cache window and no forced refresh is requested
- **THEN** the system serves the cached response instead of making a network request

