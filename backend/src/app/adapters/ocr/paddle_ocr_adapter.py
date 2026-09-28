import asyncio
import io
import re
from typing import Any

import structlog
from PIL import Image

from app.adapters.ocr.preprocessor import ImagePreprocessor
from app.domain.exceptions import OcrProcessingError
from app.ports.ocr_provider import OcrProvider, OcrResult

logger = structlog.get_logger(__name__)

# Regex pattern for extracting Indian plate candidates from raw text
PLATE_REGEX = re.compile(r"[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}")


class PaddleOcrAdapter(OcrProvider):
    """
    PaddleOCR adapter implementing OcrProvider port.
    Preprocesses images and extracts plate registrations safely off the main event loop.
    """

    def __init__(
        self,
        use_angle_cls: bool = True,
        lang: str = "en",
        mock_mode: bool = False,
    ) -> None:
        self._preprocessor = ImagePreprocessor()
        self._use_angle_cls = use_angle_cls
        self._lang = lang
        self._mock_mode = mock_mode
        self._ocr_engine: Any = None
        self._engine_type: str | None = None

    def _get_ocr_engine(self) -> Any:
        """Lazy load real OCR engine instance (PaddleOCR or EasyOCR) if available."""
        if self._mock_mode:
            return None

        if self._ocr_engine is None:
            # 1. Attempt loading PaddleOCR
            try:
                from paddleocr import PaddleOCR  # type: ignore[import-not-found]
                self._ocr_engine = PaddleOCR(
                    use_angle_cls=self._use_angle_cls,
                    lang=self._lang,
                    show_log=False,
                )
                self._engine_type = "PaddleOCR"
                logger.info("ocr_engine_loaded", engine="PaddleOCR")
                return self._ocr_engine
            except Exception as exc:  # noqa: BLE001
                logger.info("paddleocr_not_available_trying_easyocr", error=str(exc))

            # 2. Attempt loading EasyOCR
            try:
                import easyocr
                self._ocr_engine = easyocr.Reader([self._lang], gpu=False)
                self._engine_type = "EasyOCR"
                logger.info("ocr_engine_loaded", engine="EasyOCR")
                return self._ocr_engine
            except Exception as exc:  # noqa: BLE001
                logger.error("no_real_ocr_engine_available", error=str(exc))
                raise OcrProcessingError(
                    "No real OCR engine available (EasyOCR/PaddleOCR uninstalled). Manual review required."
                ) from exc

        return self._ocr_engine

    async def extract_registration(self, image_bytes: bytes) -> OcrResult:
        """
        Extract vehicle registration from image bytes off the FastAPI main event loop.
        """
        return await asyncio.to_thread(self._sync_extract, image_bytes)

    def _sync_extract(self, image_bytes: bytes) -> OcrResult:
        """Synchronous OCR processing implementation using real ML engine or synthetic fallback."""
        processed_bytes = self._preprocessor.validate_and_preprocess(image_bytes)

        engine = self._get_ocr_engine()
        if engine is not None:
            try:
                import numpy as np

                img = Image.open(io.BytesIO(processed_bytes)).convert("RGB")
                img_np = np.array(img)

                raw_lines: list[str] = []
                confidences: list[float] = []
                boxes: list[Any] = []

                if self._engine_type == "PaddleOCR":
                    ocr_res = engine.ocr(img_np, cls=self._use_angle_cls)
                    if ocr_res and ocr_res[0]:
                        for line in ocr_res[0]:
                            box, (text_val, conf_val) = line
                            raw_lines.append(text_val)
                            confidences.append(float(conf_val))
                            boxes.append(box)
                elif self._engine_type == "EasyOCR":
                    ocr_res = engine.readtext(img_np)
                    if ocr_res:
                        for box, text_val, conf_val in ocr_res:
                            raw_lines.append(str(text_val))
                            confidences.append(float(conf_val))
                            boxes.append(box)

                raw_text = " ".join(raw_lines).strip()
                avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

                candidate = self._extract_plate_candidate(raw_text)
                is_valid_plate = bool(PLATE_REGEX.search(candidate))

                normalized = candidate if is_valid_plate else ""
                final_confidence = round(avg_confidence, 4) if is_valid_plate else 0.0

                return OcrResult(
                    raw_text=raw_text,
                    normalized_registration=normalized,
                    confidence=final_confidence,
                    engine_name=self._engine_type or "RealOCR",
                    bounding_box=boxes if boxes else None,
                    metadata={"line_count": len(raw_lines), "raw_confidence": round(avg_confidence, 4)},
                )
            except Exception as exc:
                logger.error("real_ocr_execution_failed", error=str(exc))
                raise OcrProcessingError(f"Real OCR execution failed: {exc}") from exc

        # Fallback / Mock Engine Mode for Development & Testing
        return self._synthetic_ocr_extract(image_bytes, processed_bytes)

    def _synthetic_ocr_extract(self, raw_bytes: bytes, processed_bytes: bytes) -> OcrResult:
        """Synthetic OCR extraction for tests and offline development."""
        meta_text = ""

        # Inspect embedded test_text PNG metadata if present
        try:
            img = Image.open(io.BytesIO(raw_bytes))
            meta_text = str(img.info.get("test_text", ""))
        except Exception:  # noqa: S110, BLE001
            pass

        if "FAIL" in meta_text or "FAIL" in str(raw_bytes):
            raise OcrProcessingError("OCR inference failed")

        if "AMBIGUOUS" in meta_text or "EMPTY" in meta_text:
            return OcrResult(
                raw_text="",
                normalized_registration="",
                confidence=0.0,
                engine_name="PaddleOCR-Synthetic",
                metadata={"synthetic": True},
            )

        # Extract plate candidate from metadata or text string
        candidate = self._extract_plate_candidate(meta_text)
        is_valid_plate = bool(PLATE_REGEX.search(candidate))

        if is_valid_plate:
            confidence = 0.65 if ("LOW_CONF" in meta_text) else 0.95
            formatted_text = f"{candidate[:2]} {candidate[2:4]} {candidate[4:6]} {candidate[6:]}".strip()
            return OcrResult(
                raw_text=formatted_text,
                normalized_registration=candidate,
                confidence=confidence,
                engine_name="PaddleOCR-Synthetic",
                metadata={"synthetic": True},
            )

        # No valid plate detected in non-vehicle image
        return OcrResult(
            raw_text="",
            normalized_registration="",
            confidence=0.0,
            engine_name="PaddleOCR-Synthetic",
            metadata={"synthetic": True, "no_plate_detected": True},
        )

    @staticmethod
    def _extract_plate_candidate(text: str) -> str:
        """Extract and normalize registration candidate from raw OCR text string."""
        clean = "".join(text.upper().split()).replace("-", "").replace(".", "")
        match = PLATE_REGEX.search(clean)
        if match:
            return match.group(0)

        if len(clean) >= 6:
            state = clean[:2]
            rest = clean[2:]
            confusables = {"O": "0", "I": "1", "L": "1", "Z": "2", "S": "5", "G": "6"}
            rest_norm = "".join(
                confusables.get(c, c) if (i < 2 or i >= len(rest) - 4) else c
                for i, c in enumerate(rest)
            )
            candidate = state + rest_norm
            match_norm = PLATE_REGEX.search(candidate)
            if match_norm:
                return match_norm.group(0)

        return clean
