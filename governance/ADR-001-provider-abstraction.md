# ADR-001: Compliance Provider Abstraction

## Status
Accepted.

## Decision
All external CNG compliance sources are accessed through a `ComplianceProvider` interface. Application code consumes the normalized domain model rather than provider-specific payloads.

## Rationale
The authoritative provider/API is not yet fixed and may differ by geography or authority. This isolates change, supports mocks for development and enables contractual testing.

## Consequence
Each provider requires a separately tested adapter and must preserve source reference/timestamp for auditability.
