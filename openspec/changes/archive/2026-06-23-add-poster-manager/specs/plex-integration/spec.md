## ADDED Requirements

### Requirement: Connect to a Plex server

The system SHALL connect to a Plex Media Server using a base URL and an `X-Plex-Token`, and SHALL verify connectivity before performing library operations.

#### Scenario: Valid credentials

- **WHEN** a base URL and a valid token are configured and the user triggers a connection test
- **THEN** the system queries the Plex server identity endpoint and reports a successful connection with the server name and version

#### Scenario: Invalid or unreachable server

- **WHEN** the URL is unreachable or the token is rejected
- **THEN** the system reports a connection failure with the reason (network error vs. 401 unauthorized) and does not proceed with library operations

### Requirement: List library sections

The system SHALL list the Plex library sections, filtered to movie and show section types.

#### Scenario: Sections enumerated

- **WHEN** a connection is established and the user requests sections
- **THEN** the system returns each movie and show section with its key, title, and type, and excludes non-media sections (e.g., music, photos)

### Requirement: List items in a section

The system SHALL list the items of a section, returning for each item its rating key, title, year, type, GUIDs, and the URL of its current poster (thumb).

#### Scenario: Items returned with metadata

- **WHEN** the user opens a section
- **THEN** the system returns the section's items each with rating key, title, year, type, the set of external GUIDs (tmdb/imdb/tvdb when present), and a current-poster URL resolved against the Plex server and token

#### Scenario: Item missing external GUIDs

- **WHEN** an item has no tmdb/imdb/tvdb GUID
- **THEN** the system still returns the item and flags it as unresolvable for MediaUX lookup rather than omitting it

### Requirement: Apply a poster via the Plex API

The system SHALL set an item's poster by supplying an image URL to the Plex `posters` endpoint, and SHALL lock the poster field so Plex's automatic agents do not overwrite it.

#### Scenario: Poster applied and locked

- **WHEN** the system applies a candidate poster URL to an item's rating key
- **THEN** the Plex server fetches and sets the image as the selected poster, the system locks the poster field, and the operation reports success

#### Scenario: Plex rejects the upload

- **WHEN** the Plex server returns an error while setting the poster (e.g., the image URL is unreachable from Plex)
- **THEN** the system reports the failure with the Plex status and does not lock the field
