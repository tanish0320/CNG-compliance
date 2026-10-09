import asyncio
import json
import os
import sys
import cv2
import numpy as np

sys.path.insert(0, "backend/src")
import easyocr
from app.adapters.plate_detection.yolo_plate_detector import YoloPlateDetectorAdapter
from app.domain.registration_normalizer import IndianRegistrationNormalizer

def calculate_contrast_and_color_metrics(crop_bgr):
    """
    Computes contrast metrics and foreground-to-background color similarity on plate crop.
    Low contrast / same colour indicates digits blend into the background.
    """
    if crop_bgr is None or crop_bgr.size == 0:
        return {
            "gray_std": 0.0,
            "michelson_contrast": 0.0,
            "delta_e_color_diff": 0.0,
            "laplacian_var": 0.0,
            "mean_fg": 0.0,
            "mean_bg": 0.0,
        }
        
    gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
    
    # Global intensity std
    gray_std = float(np.std(gray))
    
    # Otsu thresholding to segment text vs plate background
    otsu_thresh, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    mask_0 = (binary == 0)
    mask_255 = (binary == 255)
    
    mean_0 = float(np.mean(gray[mask_0])) if np.any(mask_0) else 0.0
    mean_255 = float(np.mean(gray[mask_255])) if np.any(mask_255) else 255.0
    
    # Michelson contrast = (Imax - Imin) / (Imax + Imin)
    michelson = abs(mean_255 - mean_0) / (mean_255 + mean_0 + 1e-5)
    
    # Color difference in LAB space between the two clusters
    lab = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2LAB)
    fg_lab = np.mean(lab[mask_0], axis=0) if np.any(mask_0) else np.zeros(3)
    bg_lab = np.mean(lab[mask_255], axis=0) if np.any(mask_255) else np.zeros(3)
    delta_e = float(np.linalg.norm(fg_lab - bg_lab))
    
    # Local edge energy using Laplacian
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    
    return {
        "gray_std": round(gray_std, 2),
        "michelson_contrast": round(michelson, 3),
        "delta_e_color_diff": round(delta_e, 2),
        "laplacian_var": round(laplacian_var, 2),
        "mean_fg": round(min(mean_0, mean_255), 1),
        "mean_bg": round(max(mean_0, mean_255), 1),
    }

async def run_diagnostics():
    print("Loading YOLO Plate Detector...")
    detector = YoloPlateDetectorAdapter(mock_mode=False)
    detector._init_yolo()
    
    print("Loading EasyOCR Reader...")
    reader = easyocr.Reader(["en"], gpu=False)
    
    photos_dir = "Photos"
    files = sorted([f for f in os.listdir(photos_dir) if f.endswith((".jpeg", ".jpg", ".png"))])
    print(f"Total photos to diagnose: {len(files)}")
    
    os.makedirs("detected_crops", exist_ok=True)
    os.makedirs("scripts", exist_ok=True)
    
    results = []
    
    for idx, fname in enumerate(files, 1):
        fpath = os.path.join(photos_dir, fname)
        with open(fpath, "rb") as f:
            img_bytes = f.read()
            
        full_cv2 = cv2.imread(fpath)
        if full_cv2 is None:
            continue
            
        det_res = await detector.detect_plate(img_bytes)
        
        if det_res.detected and det_res.bbox:
            x1, y1, x2, y2 = det_res.bbox
            plate_crop = full_cv2[y1:y2, x1:x2]
            crop_source = "yolo_crop"
        else:
            plate_crop = full_cv2
            crop_source = "full_image"
            
        if plate_crop is None or plate_crop.size == 0:
            plate_crop = full_cv2
            
        # Save crop for inspection
        crop_fname = f"crop_{idx:02d}.jpg"
        crop_path = os.path.join("detected_crops", crop_fname)
        cv2.imwrite(crop_path, plate_crop)
        
        metrics = calculate_contrast_and_color_metrics(plate_crop)
        
        # OCR directly on plate crop
        try:
            ocr_out = reader.readtext(plate_crop)
            raw_lines = [text for (_, text, conf) in ocr_out if text.strip()]
            confidences = [conf for (_, text, conf) in ocr_out if text.strip()]
            raw_text = " ".join(raw_lines).strip()
            ocr_conf = float(np.mean(confidences)) if confidences else 0.0
        except Exception as e:
            raw_text = ""
            ocr_conf = 0.0
            
        norm_obj = IndianRegistrationNormalizer.normalize(raw_text)
        is_valid_norm = norm_obj.is_valid
        
        # Criteria for Low Contrast / Same Colour:
        # Digits blend into the background:
        # Either color delta E is very low, or Michelson contrast is very low, or gray std is low
        is_low_contrast = (
            metrics["delta_e_color_diff"] < 28.0 or 
            metrics["michelson_contrast"] < 0.28 or 
            metrics["gray_std"] < 28.0
        )
        
        failure_reasons = []
        if not det_res.detected:
            failure_reasons.append("plate_detection_missed")
        if is_low_contrast:
            failure_reasons.append("low_contrast_same_color")
        if not is_valid_norm:
            failure_reasons.append("invalid_registration_format")
        if ocr_conf < 0.80:
            failure_reasons.append(f"low_ocr_conf({ocr_conf:.2f})")
            
        results.append({
            "index": idx,
            "filename": fname,
            "plate_detected": det_res.detected,
            "detector_conf": round(det_res.confidence, 2),
            "bbox": det_res.bbox,
            "crop_source": crop_source,
            "crop_image": crop_fname,
            "metrics": metrics,
            "raw_text": raw_text,
            "normalized_registration": norm_obj.normalized_plate if is_valid_norm else raw_text,
            "formatted_registration": norm_obj.formatted_plate if is_valid_norm else "NO_VALID_PLATE",
            "is_valid_plate": is_valid_norm,
            "ocr_confidence": round(ocr_conf, 3),
            "is_low_contrast": is_low_contrast,
            "failure_reasons": failure_reasons,
        })
        
        flag = "LOW_CONTRAST" if is_low_contrast else ("VALID" if is_valid_norm and ocr_conf >= 0.80 else "REVIEW_REQ")
        print(f"[{idx:02d}/84] {fname[-30:]:<30} -> {norm_obj.formatted_plate:<14} | Conf: {ocr_conf:.2f} | dE: {metrics['delta_e_color_diff']:<5} | Status: {flag}")

    with open("scripts/diagnostics_results.json", "w") as fp:
        json.dump(results, fp, indent=2)
        
    low_contrast_count = sum(1 for r in results if r["is_low_contrast"])
    valid_count = sum(1 for r in results if r["is_valid_plate"] and r["ocr_confidence"] >= 0.80)
    failed_count = len(results) - valid_count
    
    print("\n" + "=" * 70)
    print("                 DIAGNOSTICS SUMMARY                 ")
    print("=" * 70)
    print(f"Total Images Processed : {len(results)}")
    print(f"High-Confidence Passed : {valid_count}")
    print(f"Needs Manual Review    : {failed_count}")
    print(f"Low-Contrast Flagged   : {low_contrast_count}")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_diagnostics())
