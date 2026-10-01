import io

from PIL import Image, ImageEnhance, ImageOps

from app.domain.exceptions import InvalidImageError

MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


class ImagePreprocessor:
    """Robust image validation and preprocessing pipeline for OCR/ANPR."""

    def __init__(self, max_size_bytes: int = MAX_IMAGE_SIZE_BYTES) -> None:
        self.max_size_bytes = max_size_bytes

    def validate_and_preprocess(self, image_bytes: bytes) -> bytes:
        """
        Validate image format, size, and integrity, then apply contrast enhancement,
        grayscale conversion, noise reduction, and resizing for OCR processing.
        """
        if not image_bytes:
            raise InvalidImageError("Uploaded image file is empty")

        if len(image_bytes) > self.max_size_bytes:
            raise InvalidImageError(
                f"Image size exceeds maximum allowed size of {self.max_size_bytes // (1024 * 1024)} MB"
            )

        try:
            image = Image.open(io.BytesIO(image_bytes))
            image.verify()
        except Exception as exc:
            raise InvalidImageError(f"Corrupted or unreadable image file: {exc}") from exc

        # Re-open after verify() as verify renders original instance unusable for operations
        try:
            image = Image.open(io.BytesIO(image_bytes))
            if image.format not in ALLOWED_FORMATS:
                raise InvalidImageError(
                    f"Unsupported image format: '{image.format}'. Allowed formats: {ALLOWED_FORMATS}"
                )

            # Prevent decompression bomb attacks
            if image.width * image.height > 25_000_000:
                raise InvalidImageError("Image dimensions are excessively large")

            # Preprocessing steps:
            # 1. Grayscale conversion
            gray = ImageOps.grayscale(image)

            # 2. Auto contrast enhancement
            enhanced = ImageOps.autocontrast(gray, cutoff=2)

            # 3. Increase sharpness
            sharpener = ImageEnhance.Sharpness(enhanced)
            sharpened = sharpener.enhance(2.0)

            # 4. Resize to target resolution (height ~300px maintaining aspect ratio)
            target_height = 300
            if sharpened.height != target_height:
                aspect_ratio = sharpened.width / float(sharpened.height)
                target_width = int(target_height * aspect_ratio)
                processed_image = sharpened.resize(
                    (target_width, target_height), Image.Resampling.LANCZOS
                )
            else:
                processed_image = sharpened

            output_buffer = io.BytesIO()
            processed_image.save(output_buffer, format="PNG")
            return output_buffer.getvalue()

        except InvalidImageError:
            raise
        except Exception as exc:
            raise InvalidImageError(f"Failed to process image: {exc}") from exc

    def create_ocr_variants(self, image_bytes: bytes) -> list[tuple[str, bytes]]:
        """
        Generate deterministic image preprocessing variants for crop OCR candidate evaluation:
        1. Default autocontrast + sharpening (PIL)
        2. CLAHE contrast equalization (OpenCV)
        3. Adaptive threshold binarization (OpenCV)
        """
        variants: list[tuple[str, bytes]] = []

        # Variant 1: Default Autocontrast & Sharpening
        v1_bytes = self.validate_and_preprocess(image_bytes)
        variants.append(("autocontrast_sharpened", v1_bytes))

        try:
            import cv2
            import numpy as np

            img_pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img_np = np.array(img_pil)

            gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

            # Upscale crop 2.5x to target height ~350px maintaining aspect ratio
            target_h = 350
            h, w = gray.shape[:2]
            if h > 0 and h != target_h:
                scale = target_h / float(h)
                target_w = max(10, int(w * scale))
                gray_resized = cv2.resize(gray, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
            else:
                gray_resized = gray

            # Variant 2: CLAHE Contrast Equalization
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            clahe_img = clahe.apply(gray_resized)

            buf_clahe = io.BytesIO()
            Image.fromarray(clahe_img).save(buf_clahe, format="PNG")
            variants.append(("clahe_contrast", buf_clahe.getvalue()))

            # Variant 3: Adaptive Binarization Thresholding
            blurred = cv2.GaussianBlur(gray_resized, (3, 3), 0)
            thresh_img = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            buf_thresh = io.BytesIO()
            Image.fromarray(thresh_img).save(buf_thresh, format="PNG")
            variants.append(("adaptive_threshold", buf_thresh.getvalue()))

        except Exception:  # noqa: BLE001
            pass

        return variants
