# Data Model

## Verification
- `id` UUID
- `tenant_id`
- `station_id` / `unit_id`
- `actor_id`
- `vehicle_registration`
- `ocr_raw_text`
- `ocr_confidence`
- `capture_quality_score`
- `status`
- `compliance_id`
- `compliance_status`
- `issued_at`
- `expires_at`
- `provider_name`
- `provider_reference`
- `provider_timestamp`
- `rule_version`
- `manual_review_required`
- `created_at`
- `updated_at`

## AuditEvent
- `id`
- `verification_id`
- `actor_id`
- `event_type`
- `event_version`
- `timestamp`
- `correlation_id`
- `metadata_json`

## RuleVersion
- `version`
- `effective_from`
- `definition_hash`
- `approved_by`
- `approved_at`

## Evidence
- `id`
- `verification_id`
- `object_key`
- `content_hash`
- `retention_until`
- `classification`
