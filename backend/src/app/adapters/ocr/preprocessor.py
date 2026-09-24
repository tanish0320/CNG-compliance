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
