from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class OcrResult:
    raw_text: str
    normalized_registration: str
    confidence: float
    formatted_registration: str = ""
    engine_name: str = "PaddleOCR"
    detection_source: str = "ocr"
    bounding_box: list[list[float]] | None = None
    metadata: dict[str, Any] | None = None

    @property
    def text(self) -> str:
        """Backwards compatibility property alias."""
        return self.raw_text


class OcrProvider(ABC):
    """Port for extracting a vehicle registration from image bytes."""

    @abstractmethod
    async def extract_registration(self, image_bytes: bytes) -> OcrResult:
        """Extract a registration candidate, raw text, and confidence score."""
        raise NotImplementedError
