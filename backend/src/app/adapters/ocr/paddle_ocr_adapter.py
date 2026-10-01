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

from app.domain.registration_normalizer import IndianRegistrationNormalizer

# Regex pattern for extracting Indian plate candidates from raw text
PLATE_REGEX = re.compile(r"[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}")


class PaddleOcrAdapter(OcrProvider):
    """
    PaddleOCR / EasyOCR adapter implementing OcrProvider port.
    Preprocesses images, normalizes registration text, and calculates OCR confidence safely off the main event loop.
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
        engine = self._get_ocr_engine()
        if engine is not None:
            try:
                import numpy as np

                variants = self._preprocessor.create_ocr_variants(image_bytes)
                best_candidate: dict[str, Any] | None = None
                best_score = (-1, -1.0)

                for var_name, var_bytes in variants:
                    img = Image.open(io.BytesIO(var_bytes)).convert("RGB")
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
                                text_str = str(text_val).strip()
                                if text_str:
                                    raw_lines.append(text_str)
                                    confidences.append(float(conf_val))
                                    boxes.append(box)

                    raw_text = " ".join(raw_lines).strip()
                    avg_confidence = (
                        sum(confidences) / len(confidences) if confidences else 0.0
                    )
                    norm_res = IndianRegistrationNormalizer.normalize(raw_text)

                    # Score candidate: prefer valid Indian registration format first, then higher confidence
                    valid_score = 1 if norm_res.is_valid else 0
                    cand_score = (valid_score, avg_confidence)

                    logger.info(
                        "ocr_variant_evaluated",
                        variant=var_name,
                        raw_text=raw_text,
                        confidence=avg_confidence,
                        is_valid=norm_res.is_valid,
                        normalized=norm_res.normalized_plate,
                    )

                    if cand_score > best_score or best_candidate is None:
                        best_score = cand_score
                        best_candidate = {
                            "raw_text": raw_text,
                            "norm_res": norm_res,
                            "confidence": round(avg_confidence, 4),
                            "boxes": boxes,
                            "variant": var_name,
                            "line_count": len(raw_lines),
                        }

                if best_candidate is not None:
                    norm_res = best_candidate["norm_res"]
                    return OcrResult(
                        raw_text=best_candidate["raw_text"],
                        normalized_registration=norm_res.normalized_plate,
                        formatted_registration=norm_res.formatted_plate,
                        confidence=best_candidate["confidence"],
                        engine_name=self._engine_type or "RealOCR",
                        detection_source="ocr",
                        bounding_box=best_candidate["boxes"] if best_candidate["boxes"] else None,
                        metadata={
                            "line_count": best_candidate["line_count"],
                            "is_valid_format": norm_res.is_valid,
                            "raw_confidence": best_candidate["confidence"],
                            "best_variant": best_candidate["variant"],
                        },
                    )
            except Exception as exc:
                logger.error("real_ocr_execution_failed", error=str(exc))
                raise OcrProcessingError(f"Real OCR execution failed: {exc}") from exc

        # Fallback / Mock Engine Mode for Development & Testing
        processed_bytes = self._preprocessor.validate_and_preprocess(image_bytes)
        return self._synthetic_ocr_extract(image_bytes, processed_bytes)

    def _synthetic_ocr_extract(self, raw_bytes: bytes, processed_bytes: bytes) -> OcrResult:
        """Synthetic OCR extraction for tests and offline development."""
        meta_text = ""

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
                formatted_registration="NO_PLATE_DETECTED",
                confidence=0.0,
                engine_name="PaddleOCR-Synthetic",
                detection_source="mock",
                metadata={"synthetic": True},
            )

        norm_res = IndianRegistrationNormalizer.normalize(meta_text or "DL01AB1234")
        confidence = 0.65 if ("LOW_CONF" in meta_text) else 0.95

        return OcrResult(
            raw_text=meta_text or norm_res.formatted_plate,
            normalized_registration=norm_res.normalized_plate,
            formatted_registration=norm_res.formatted_plate,
            confidence=confidence if norm_res.is_valid else 0.0,
            engine_name="PaddleOCR-Synthetic",
            detection_source="mock",
            metadata={"synthetic": True},
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
