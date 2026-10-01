import hashlib
import io
import os
import time
import uuid
from PIL import Image, ImageDraw, ImageFont

from app.adapters.ocr.paddle_ocr_adapter import PaddleOcrAdapter
from app.adapters.plate_detection import YoloPlateDetectorAdapter
from app.adapters.mock_compliance_provider import MockComplianceProvider
from app.api.routes.verification import set_idempotency_store, set_verification_repository
from app.core.config import get_settings
from app.domain.models import ComplianceStatus
from app.ports.idempotency_store import InMemoryIdempotencyStore
from app.services.verification_service import VerificationService


def create_realistic_plate_image(reg: str, plate_type: str = "white", angle: int = 0) -> bytes:
    """Generate realistic vehicle plate scenes with clear text for OCR testing."""
    bg_color = (255, 255, 255) if plate_type == "white" else (255, 204, 0)
    text_color = (0, 0, 0)

    canvas = Image.new("RGB", (800, 600), color=(120, 130, 140))
    d = ImageDraw.Draw(canvas)
    d.rectangle([100, 200, 700, 500], fill=(50, 50, 60))

    plate_img = Image.new("RGB", (460, 100), color=bg_color)
    pd = ImageDraw.Draw(plate_img)
    pd.rectangle([4, 4, 456, 96], outline=(0, 0, 0), width=4)
    pd.rectangle([12, 15, 36, 85], fill=(0, 102, 204))

    # Large high-contrast text rendering
    try:
        font = ImageFont.truetype("arial.ttf", 44)
    except Exception:
        font = ImageFont.load_default()

    pd.text((50, 25), reg, fill=text_color, font=font)

    if angle != 0:
        plate_img = plate_img.rotate(angle, expand=True, fillcolor=(50, 50, 60))

    pw, ph = plate_img.size
    px, py = (800 - pw) // 2, (600 - ph) // 2
    canvas.paste(plate_img, (px, py))

    buf = io.BytesIO()
    canvas.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


def create_non_plate_image() -> bytes:
    """Generate a non-plate vehicle/object image."""
    canvas = Image.new("RGB", (600, 400), color=(200, 200, 210))
    d = ImageDraw.Draw(canvas)
    d.ellipse([200, 100, 400, 300], fill=(220, 50, 50))
    d.text((250, 190), "PEPSI", fill=(255, 255, 255))
    buf = io.BytesIO()
    canvas.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


def create_multiple_plates_image() -> bytes:
    """Generate a scene containing multiple vehicle plates."""
    canvas = Image.new("RGB", (1000, 600), color=(100, 100, 110))
    p1 = Image.new("RGB", (280, 80), color=(255, 255, 255))
    ImageDraw.Draw(p1).rectangle([2, 2, 278, 78], outline=(0, 0, 0), width=3)
    ImageDraw.Draw(p1).text((20, 20), "MH12AB1234", fill=(0, 0, 0))
    canvas.paste(p1, (100, 250))

    p2 = Image.new("RGB", (280, 80), color=(255, 204, 0))
    ImageDraw.Draw(p2).rectangle([2, 2, 278, 78], outline=(0, 0, 0), width=3)
    ImageDraw.Draw(p2).text((20, 20), "DL01CD5678", fill=(0, 0, 0))
    canvas.paste(p2, (600, 250))

    buf = io.BytesIO()
    canvas.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


async def run_business_verification_suite():
    detector = YoloPlateDetectorAdapter(mock_mode=False)
    detector._init_yolo()

    ocr_adapter = PaddleOcrAdapter(mock_mode=False)
    compliance_provider = MockComplianceProvider()
    service = VerificationService(
        provider=compliance_provider,
        repository=None,
    )
    settings = get_settings()

    test_cases = [
        ("RJ32 IND GD9600 Plate", "RJ32GD9600", create_realistic_plate_image("RJ32 IND GD9600", "white", 0)),
        ("White HSRP Plate", "DL01AB1234", create_realistic_plate_image("DL01AB1234", "white", 0)),
        ("Yellow Commercial Plate", "MH12PQ9999", create_realistic_plate_image("MH12PQ9999", "yellow", 0)),
        ("Motorcycle Plate", "KA05HK4321", create_realistic_plate_image("KA05HK4321", "white", 0)),
        ("Slight Viewing Angle", "HR26DQ5555", create_realistic_plate_image("HR26DQ5555", "white", -10)),
        ("Distance Image", "UP14AZ7777", create_realistic_plate_image("UP14AZ7777", "white", 0)),
        ("Non-Plate Image", "N/A", create_non_plate_image()),
        ("Multiple Plates Image", "MULTIPLE", create_multiple_plates_image()),
    ]

    results = []

    for name, expected_reg, img_bytes in test_cases:
        det_res = await detector.detect_plate(img_bytes)

        ocr_input = det_res.crop_bytes if (det_res.detected and det_res.crop_bytes) else img_bytes
        ocr_res = await ocr_adapter.extract_registration(ocr_input)

        extracted_reg = ocr_res.normalized_registration or "N/A"
        match = "YES" if (extracted_reg == expected_reg) else ("NO" if expected_reg != "N/A" else "N/A")

        # Trace exact gating conditions
        plate_valid = det_res.detected and not det_res.multiple_detected and det_res.confidence >= settings.plate_detection_confidence_threshold
        high_ocr_conf = ocr_res.confidence >= settings.ocr_confidence_threshold
        is_automated_verification = plate_valid and bool(ocr_res.normalized_registration) and high_ocr_conf

        if is_automated_verification:
            ver_res = await service.verify(
                vehicle_registration=extracted_reg,
                ocr_confidence=ocr_res.confidence,
                idempotency_key=str(uuid.uuid4()),
            )
            compliance_result = ver_res.status.value
        else:
            compliance_result = ComplianceStatus.MANUAL_REVIEW.value

        results.append({
            "test": name,
            "expected": expected_reg,
            "extracted": extracted_reg,
            "match": match,
            "ocr_conf": f"{ocr_res.confidence:.2f}",
            "compliance_result": compliance_result,
        })

    print("\n=========================================================================")
    print("           CNG BUSINESS REGISTRATION VERIFICATION SUITE                  ")
    print("=========================================================================\n")
    print(f"{'Test Case':<25} | {'Expected Reg':<12} | {'Extracted Reg':<14} | {'Match':<5} | {'OCR Conf':<8} | {'Compliance Result'}")
    print("-" * 95)
    for r in results:
        print(f"{r['test']:<25} | {r['expected']:<12} | {r['extracted']:<14} | {r['match']:<5} | {r['ocr_conf']:<8} | {r['compliance_result']}")
    print("-" * 95 + "\n")

    return results


if __name__ == "__main__":
    import asyncio
    asyncio.run(run_business_verification_suite())
