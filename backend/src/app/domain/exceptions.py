class DomainError(Exception):
    """Base class for domain errors."""


class InvalidRegistrationError(DomainError):
    """Raised when a vehicle registration number is invalid."""


class IdempotencyConflictError(DomainError):
    """Raised when an idempotency key is reused with a different request payload."""


class ProviderUnavailableError(DomainError):
    """Raised when the compliance provider service is unavailable or timed out."""


class InvalidImageError(DomainError):
    """Raised when an uploaded image is invalid, corrupted, or unsupported."""


class OcrProcessingError(DomainError):
    """Raised when the OCR extraction pipeline fails."""
