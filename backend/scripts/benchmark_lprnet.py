import os
import io
import time
import cv2
import numpy as np
import torch
import torch.nn as nn
from PIL import Image

# Import existing EasyOCR & normalizer components from CNG backend
from app.adapters.ocr.paddle_ocr_adapter import PaddleOcrAdapter
from app.domain.registration_normalizer import IndianRegistrationNormalizer

VALID_INDIAN_STATES = {
    "AN", "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN",
    "GA", "GJ", "HR", "HP", "JH", "JK", "KA", "KL", "LA", "LD",
    "MH", "ML", "MN", "MP", "MZ", "NL", "OD", "PB", "PY", "RJ",
    "SK", "TN", "TR", "TS", "UK", "UP", "WB"
}

def enhanced_positional_fix(text: str) -> str:
    """
    Apply strict positional character role fixing for 10-character Indian registrations:
    [Letter, Letter] [Digit, Digit] [Letter, Letter] [Digit, Digit, Digit, Digit]
    """
    clean = "".join(text.upper().split()).replace("-", "").replace("IND", "").replace("INDIA", "")
    clean = "".join(c for c in clean if c.isalnum())

    if len(clean) != 10:
        return clean

    to_letters = {'0': 'O', '1': 'I', '5': 'S', '8': 'B', '2': 'Z'}
    to_digits = {'O': '0', 'Q': '0', 'I': '1', 'L': '1', 'T': '1', 'S': '5', 'B': '8', 'Z': '2', 'G': '6'}

    chars = list(clean)

    # 1. State code (chars 0..1)
    for i in (0, 1):
        if chars[i] in to_letters:
            chars[i] = to_letters[chars[i]]

    state = "".join(chars[:2])
    if state not in VALID_INDIAN_STATES:
        return clean

    # 2. RTO digits (chars 2..3)
    for i in (2, 3):
        if chars[i] in to_digits:
            chars[i] = to_digits[chars[i]]

    # 3. Series letters (chars 4..5)
    for i in (4, 5):
        if chars[i] in to_letters:
            chars[i] = to_letters[chars[i]]

    # 4. Number digits (chars 6..9)
    for i in range(6, 10):
        if chars[i] in to_digits:
            chars[i] = to_digits[chars[i]]

    return "".join(chars)


def generate_synthetic_plate_image(text: str) -> np.ndarray:
    """Generate synthetic Indian plate image for benchmark test cases."""
    img = np.ones((80, 280, 3), dtype=np.uint8) * 255
    cv2.rectangle(img, (2, 2), (277, 77), (0, 0, 0), 3)
    cv2.rectangle(img, (2, 2), (30, 77), (216, 79, 29), -1)
    cv2.putText(img, "IND", (5, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

    cv2.putText(img, text, (40, 52), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 3)
    return img


async def main():
    print("==================================================================")
    print("   ISOLATED BENCHMARK: PHYSICAL OCR FAILURE DIAGNOSTIC & PROPOSAL ")
    print("==================================================================")

    easyocr_adapter = PaddleOcrAdapter(mock_mode=False)

    test_scenarios = [
        ("Bad Physical Capture (HR55AZ6100)", "HR55AZ6100", generate_synthetic_plate_image("IND HRSSA 26100")),
        ("Physical S24 Capture (RJ32GD9600)", "RJ32GD9600", generate_synthetic_plate_image("RJ3z IND GD9600")),
        ("HR55AZ6100 Standard HSRP", "HR55AZ6100", generate_synthetic_plate_image("IND HR55AZ6100")),
        ("DL01AB1234 Standard HSRP", "DL01AB1234", generate_synthetic_plate_image("IND DL01AB1234")),
        ("KA05HK4321 Standard HSRP", "KA05HK4321", generate_synthetic_plate_image("IND KA05HK4321")),
        ("MH12PQ9999 Standard HSRP", "MH12PQ9999", generate_synthetic_plate_image("IND MH12PQ9999")),
        ("Yellow Commercial Plate", "RJ32GD9600", generate_synthetic_plate_image("RJ32 GD9600")),
    ]

    print("\n| Scenario | Expected | Raw OCR Text | Current Normalizer | Enhanced Normalizer | Current Match | Enhanced Match |")
    print("|---|---|---|---|---|---|---|")

    for label, expected, img_bgr in test_scenarios:
        _, buf = cv2.imencode(".jpg", img_bgr)
        jpeg_bytes = buf.tobytes()

        # Run EasyOCR adapter
        ocr_res = await easyocr_adapter.extract_registration(jpeg_bytes)
        raw_text = ocr_res.raw_text

        # Current Normalizer
        curr_norm = IndianRegistrationNormalizer.normalize(raw_text)

        # Enhanced Positional Normalizer
        fixed_text = enhanced_positional_fix(raw_text)
        enh_norm = IndianRegistrationNormalizer.normalize(fixed_text)

        curr_match = "PASS" if curr_norm.normalized_plate == expected else "FAIL"
        enh_match = "PASS" if enh_norm.normalized_plate == expected else "FAIL"

        print(
            f"| {label} | `{expected}` | `{raw_text}` | `{curr_norm.normalized_plate}` | "
            f"`{enh_norm.normalized_plate}` | {curr_match} | **{enh_match}** |"
        )


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
