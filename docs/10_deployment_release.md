# Deployment and Release

## Environments
`DEV -> QA -> UAT -> PROD`

Each promotion should be change-controlled and auditable. Configuration and secrets are environment-specific and injected at runtime.

## CI/CD gates
1. Formatting/linting.
2. Unit tests and coverage.
3. SAST and secret scan.
4. Dependency/license scan.
5. Container build and vulnerability scan.
6. Contract/integration tests.
7. Signed artifact creation.
8. Environment approval/change request.
9. Deploy.
10. Smoke test and rollback verification.

## Android
Use signed release builds, Play Integrity/enterprise distribution as applicable, versioned API compatibility, staged rollout and MDM for managed enforcement devices when available.
