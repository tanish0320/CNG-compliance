# Data Retention Guidance

Define production retention with legal/compliance stakeholders before go-live.

Recommended default principles:
- Raw vehicle image: shortest operationally necessary period; delete automatically unless retained for a documented case.
- OCR intermediate crops: ephemeral by default.
- Verification metadata: retained per audit/legal requirement.
- Audit events: append-only for approved retention period.
- Access/security logs: security-policy retention, with PII minimization.
- Manual-review evidence: case-specific retention with explicit lifecycle.
