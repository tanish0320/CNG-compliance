from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class PlateDetectionResult:
    detected: bool
    bbox: list[int] | None  # [x1, y1, x2, y2] in pixels
    confidence: float
    crop_bytes: bytes | None
    detector_name: str
    detector_version: str
    multiple_detected: bool = False
    metadata: dict[str, Any] | None = None


class PlateDetector(ABC):
    """Port for detecting vehicle license plates and returning crop regions."""

    @abstractmethod
    async def detect_plate(self, image_bytes: bytes) -> PlateDetectionResult:
        """Locate license plate in image bytes and extract bounding crop."""
        raise NotImplementedError
