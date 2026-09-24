# ADR-002: Human Confirmation for Uncertain OCR

## Status
Accepted.

## Decision
When OCR confidence or registration-format validation is below configured thresholds, a user must confirm/correct the plate before an authoritative lookup or consequential action.

## Rationale
OCR is probabilistic and field imagery can be degraded. Human confirmation reduces false matches.

## Consequence
Thresholds are measurable and configurable; the system records original OCR text and corrected value for quality analytics.
