## ADDED Requirements

### Requirement: Single-container deployment

The system SHALL build into a single Docker image that runs the full application (web UI, API, and background worker) in one container, runnable identically on macOS and on an Unraid server.

#### Scenario: Image runs the whole app

- **WHEN** the image is started with the required environment and volumes
- **THEN** the web UI, API endpoints, and background worker are all available from the single container on the configured port

#### Scenario: Same image on Mac and Unraid

- **WHEN** the same image is run on a Mac and on Unraid
- **THEN** it behaves identically given equivalent environment and mounted volumes

### Requirement: Persistent data volume

The system SHALL store its SQLite database in a mounted volume so library data, history, and settings persist across container restarts and image updates.

#### Scenario: Data survives restart

- **WHEN** the container is recreated with the same data volume mounted
- **THEN** previously synced library data, applied-poster history, and saved settings are still present

### Requirement: Mounted Kometa assets directory

The system SHALL write Kometa exports into a directory provided as a mounted volume, so the user's existing Kometa instance can consume them.

#### Scenario: Exports land in the mounted directory

- **WHEN** a Kometa export runs in the container with the assets directory mounted
- **THEN** the generated YAML is written into the mounted directory and is visible to the host and to Kometa

### Requirement: Configuration via environment and compose

The system SHALL accept credentials and paths via environment variables, and SHALL ship a documented `docker-compose` file for Unraid that wires the data volume, the Kometa assets volume, the published port, and the required environment.

#### Scenario: Compose brings the service up

- **WHEN** the user fills the documented environment in the compose file and starts it
- **THEN** the service comes up with both volumes mounted and is reachable on the published port
