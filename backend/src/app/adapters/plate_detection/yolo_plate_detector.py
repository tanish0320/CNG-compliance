import asyncio
import io
import cv2
import numpy as np
from PIL import Image
import structlog

from app.ports.plate_detector import PlateDetector, PlateDetectionResult

logger = structlog.get_logger(__name__)


import os

class YoloPlateDetectorAdapter(PlateDetector):
    """
    Plate detector implementation using YOLO / OpenCV aspect-ratio candidate localization.
    Accepts single JPEG bytes and extracts bounding box and plate crop.
    """

    def __init__(
        self,
        model_name_or_path: str | None = None,
        confidence_threshold: float = 0.25,
        min_crop_width: int = 30,
        min_crop_height: int = 15,
        mock_mode: bool = False,
    ) -> None:
        if model_name_or_path is None:
            bundled_path = os.path.join(
                os.path.dirname(__file__), "models", "indian_license_plate_yolo.pt"
            )
            if os.path.exists(bundled_path):
                model_name_or_path = bundled_path
            else:
                model_name_or_path = "yolov8n.pt"

        self._model_name = model_name_or_path
        self._conf_threshold = confidence_threshold
        self._min_width = min_crop_width
        self._min_height = min_crop_height
        self._mock_mode = mock_mode
        self._yolo_model = None
        self._initialized = False

    def _init_yolo(self) -> None:
        """Lazy load YOLO model instance."""
        if self._mock_mode or self._initialized:
            return

        try:
            from ultralytics import YOLO
            self._yolo_model = YOLO(self._model_name)
            self._initialized = True
            logger.info("yolo_plate_detector_loaded", model=self._model_name)
        except Exception as exc:
            logger.warning("yolo_plate_detector_init_failed_using_opencv_fallback", error=str(exc))
            self._initialized = True

    async def detect_plate(self, image_bytes: bytes) -> PlateDetectionResult:
        """Execute plate detection on off-thread threadpool."""
        return await asyncio.to_thread(self._sync_detect, image_bytes)

    def _sync_detect(self, image_bytes: bytes) -> PlateDetectionResult:
        if self._mock_mode:
            try:
                pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
                img_w, img_h = pil_img.size
                return PlateDetectionResult(
                    detected=True,
                    bbox=[0, 0, img_w, img_h],
                    confidence=0.99,
                    crop_bytes=image_bytes,
                    detector_name="MockPlateDetector",
                    detector_version="mock-v1",
                )
            except Exception:
                pass

        self._init_yolo()

        try:
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img_np = np.array(pil_img)
            img_h, img_w = img_np.shape[:2]
        except Exception as exc:
            logger.error("invalid_image_for_plate_detection", error=str(exc))
            return PlateDetectionResult(
                detected=False,
                bbox=None,
                confidence=0.0,
                crop_bytes=None,
                detector_name="ANPRYOLO-PlateDetector",
                detector_version="yolov8n-lpr-v1",
            )

        # 1. Attempt YOLO detection if initialized
        if self._yolo_model is not None:
            try:
                results = self._yolo_model.predict(img_np, verbose=False)
                boxes_list = []
                if results and len(results) > 0 and results[0].boxes is not None:
                    boxes = results[0].boxes
                    for box in boxes:
                        conf = float(box.conf[0].cpu().numpy())
                        if conf >= self._conf_threshold:
                            xyxy = box.xyxy[0].cpu().numpy().astype(int).tolist()
                            boxes_list.append((conf, xyxy))

                if boxes_list:
                    # Sort by confidence descending
                    boxes_list.sort(key=lambda x: x[0], reverse=True)
                    
                    # Check if detections belong to a single plate split into adjacent sub-boxes
                    min_x1 = min(b[1][0] for b in boxes_list)
                    min_y1 = min(b[1][1] for b in boxes_list)
                    max_x2 = max(b[1][2] for b in boxes_list)
                    max_y2 = max(b[1][3] for b in boxes_list)
                    
                    span_w = max_x2 - min_x1
                    span_h = max_y2 - min_y1

                    if len(boxes_list) > 1 and span_w <= img_w * 0.7 and span_h <= img_h * 0.4:
                        # Merge adjacent sub-boxes of the same plate
                        top_bbox = [min_x1, min_y1, max_x2, max_y2]
                        top_conf = max(b[0] for b in boxes_list)
                        multiple = False
                    else:
                        top_conf, top_bbox = boxes_list[0]
                        multiple = len(boxes_list) > 1

                    # Add 5% margin padding to prevent clipping edge characters
                    pad_w = int((top_bbox[2] - top_bbox[0]) * 0.05)
                    pad_h = int((top_bbox[3] - top_bbox[1]) * 0.05)
                    x1 = max(0, top_bbox[0] - pad_w)
                    y1 = max(0, top_bbox[1] - pad_h)
                    x2 = min(img_w, top_bbox[2] + pad_w)
                    y2 = min(img_h, top_bbox[3] + pad_h)
                    crop_w, crop_h = x2 - x1, y2 - y1

                    if crop_w >= self._min_width and crop_h >= self._min_height:
                        crop_pil = pil_img.crop((x1, y1, x2, y2))
                        buffer = io.BytesIO()
                        crop_pil.save(buffer, format="JPEG", quality=95)
                        crop_bytes = buffer.getvalue()

                        # Save crop image to disk for visual verification
                        crops_dir = os.path.join(os.getcwd(), "detected_crops")
                        os.makedirs(crops_dir, exist_ok=True)
                        crop_filename = f"crop_yolo_{x1}_{y1}_{x2}_{y2}.jpg"
                        crop_save_path = os.path.join(crops_dir, crop_filename)
                        crop_pil.save(crop_save_path, format="JPEG", quality=95)

                        logger.info(
                            "yolo_plate_detected",
                            bbox=[x1, y1, x2, y2],
                            confidence=top_conf,
                            multiple=multiple,
                            saved_crop=crop_save_path,
                        )

                        return PlateDetectionResult(
                            detected=True,
                            bbox=[x1, y1, x2, y2],
                            confidence=top_conf,
                            crop_bytes=crop_bytes,
                            detector_name="ANPRYOLO-PlateDetector",
                            detector_version="yolov8n-lpr-v1",
                            multiple_detected=multiple,
                            metadata={"crop_width": crop_w, "crop_height": crop_h},
                        )
            except Exception as exc:
                logger.warning("yolo_predict_failed_falling_back_to_opencv", error=str(exc))

        # 2. OpenCV contour aspect-ratio fallback detector for Indian plates
        return self._detect_opencv_fallback(img_np, pil_img)

    def _detect_opencv_fallback(self, img_np: np.ndarray, pil_img: Image.Image) -> PlateDetectionResult:
        try:
            gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
            blur = cv2.bilateralFilter(gray, 11, 17, 17)
            edged = cv2.Canny(blur, 30, 200)

            contours, _ = cv2.findContours(edged.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            contours = sorted(contours, key=cv2.contourArea, reverse=True)[:15]

            candidates = []
            img_h, img_w = img_np.shape[:2]

            for c in contours:
                peri = cv2.arcLength(c, True)
                approx = cv2.approxPolyDP(c, 0.018 * peri, True)
                if len(approx) == 4:
                    x, y, w, h = cv2.boundingRect(approx)
                    aspect_ratio = float(w) / h if h > 0 else 0
                    # Indian plates typically have aspect ratio between 2.0 and 6.0
                    if 2.0 <= aspect_ratio <= 6.0 and w >= self._min_width and h >= self._min_height:
                        candidates.append((w * h, [x, y, x + w, y + h]))

            if candidates:
                candidates.sort(key=lambda x: x[0], reverse=True)
                top_bbox = candidates[0][1]
                multiple = len(candidates) > 1

                x1, y1, x2, y2 = top_bbox
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(img_w, x2), min(img_h, y2)

                crop_pil = pil_img.crop((x1, y1, x2, y2))
                buffer = io.BytesIO()
                crop_pil.save(buffer, format="JPEG", quality=95)
                crop_bytes = buffer.getvalue()

                # Save crop image to disk for visual verification
                crops_dir = os.path.join(os.getcwd(), "detected_crops")
                os.makedirs(crops_dir, exist_ok=True)
                crop_filename = f"crop_opencv_{x1}_{y1}_{x2}_{y2}.jpg"
                crop_save_path = os.path.join(crops_dir, crop_filename)
                crop_pil.save(crop_save_path, format="JPEG", quality=95)

                logger.info("opencv_fallback_plate_detected", bbox=top_bbox, multiple=multiple, saved_crop=crop_save_path)

                return PlateDetectionResult(
                    detected=True,
                    bbox=[x1, y1, x2, y2],
                    confidence=0.70,
                    crop_bytes=crop_bytes,
                    detector_name="OpenCV-IndianPlateDetector",
                    detector_version="contour-aspect-ratio-v1",
                    multiple_detected=multiple,
                )
        except Exception as exc:
            logger.error("opencv_fallback_plate_detection_failed", error=str(exc))

        # 3. No plate detected
        return PlateDetectionResult(
            detected=False,
            bbox=None,
            confidence=0.0,
            crop_bytes=None,
            detector_name="ANPRYOLO-PlateDetector",
            detector_version="yolov8n-lpr-v1",
        )
