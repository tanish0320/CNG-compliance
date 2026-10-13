# CNG Compliance Enterprise 🚗⛽

> **Automated ANPR License Plate Recognition & MoRTH / PESO CNG Cylinder Compliance Verification System**  
> Built for CNG refueling stations, fleet operators, and traffic enforcement officers to eliminate unsafe gas refueling risks and enforce statutory hydro-testing safety regulations.

---

## 📌 Executive Summary

Vehicles operating on Compressed Natural Gas (CNG) require periodic **hydrostatic testing** of fuel cylinders every 3 years under the **Gas Cylinders Rules (PESO)** and **MoRTH AIS-028 standards**. Uncertified, expired, or retrofitted unauthorized cylinders are prone to catastrophic explosions during high-pressure (200+ bar) dispensing at refueling bays.

**CNG Compliance Enterprise** automates the inspection process at the dispensing point:
1. The pump attendant scans a vehicle's license plate using an Android smartphone.
2. The ML pipeline detects the plate via **YOLO11**, crops it with padding, enhances contrast, and reads the alphanumeric characters using **EasyOCR**.
3. The backend normalizes the plate, removes HSRP markers, and validates it against a statutory **584-record MoRTH / PESO Government Registry**.
4. Even if camera lighting or reflection causes 1–2 character OCR misreads, an intelligent **Levenshtein Fuzzy Matcher** automatically resolves the true vehicle record.
5. Within 1–2 seconds, the mobile app delivers an unmistakable, color-coded safety verdict: **`DISPENSE AUTHORIZED` (Green)** or **`DO NOT DISPENSE` (Red)**, alongside complete vehicle and cylinder telemetry.

---

## ⚡ What the App Does

- **High-Speed Plate Capture**: Live embedded camera preview (`react-native-vision-camera`) with guided HUD reticle and one-tap shutter, or gallery photo selection.
- **Immediate Dispense Verdict**:
  - 🟢 **`DISPENSE AUTHORIZED`**: Cylinder hydro-test is active and PESO compliant. Safe to refuel.
  - 🟠 **`DISPENSE WITH WARNING`**: Hydro-test certificate expires in less than 30 days. Driver alerted.
  - 🔴 **`DO NOT DISPENSE / FUELING PROHIBITED`**: Hydro-test expired or plate revoked. Gas lockout enforced.
  - 🟣 **`MANUAL REVIEW REQUIRED`**: Low OCR confidence or obscured plate. Operator review enabled.
- **Full Vehicle & Cylinder Telemetry**:
  - **Vehicle Data**: Maker & Model (e.g. *Maruti Suzuki Dzire Tour S CNG*, *Eicher Skyline Pro Bus*), Vehicle Class, Fuel Type, RTO Authority, Chassis No, Engine No.
  - **Cylinder Data**: Cylinder Serial No, Water Capacity (Liters), Kit Manufacturer & Serial, Testing Agency, Last Hydro-Test Date, Next Due Date (with countdown/overdue timer).
- **Interactive Manual Review & Correction**:
  - Picture-in-picture image crop viewer.
  - Quick-fix character substitution buttons (`0/O`, `1/I`, `8/B`, `5/S`).
  - Single-tap re-verification against the registry.
- **Station Shift History & Audit Log**:
  - Live operator shift stats (Allowed, Blocked, Reviews).
  - Searchable verification history list with timestamps and cryptographic SHA-256 evidence digests.
- **Cellular & Wi-Fi Connectivity**:
  - Runs anywhere over 4G/5G mobile data or local Wi-Fi via built-in Cloudflare Argo Tunnel with SSL/TLS encryption.
  - In-app station settings modal to configure station name, bay number, or backend endpoint.

---

## 🏗️ System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph MobileClient["📱 Mobile App (React Native + TypeScript)"]
        A[Camera Capture / Gallery Selection] --> B[Client Preprocessing & SHA-256 Hash]
        B --> C[HTTP POST /api/v1/ocr/extract]
        K[Compliance Result View] <-- N[JSON Response & Vehicle Telemetry] -- C
    end

    subgraph Edge["🌐 Edge Gateway"]
        C --> D[Cloudflare Argo Tunnel / HTTPS]
    end

    subgraph BackendEngine["⚙️ Backend Service (FastAPI / Docker)"]
        D --> E[FastAPI /ocr/extract Router]
        
        subgraph ANPR["🔍 Dual-Stage ANPR Pipeline"]
            E --> F[YOLO11 Plate Localization<br/>yolo11n_plate.pt]
            F -- Crop + Padding --> G[Image Preprocessor<br/>Bilateral Filter / Clahe / Threshold]
            G --> H[EasyOCR / PaddleOCR Text Extraction]
            H --> I[Indian Registration Normalizer<br/>HSRP Stripping & Positional Matrix]
        end

        subgraph Verification["🛡️ Compliance & Verification Engine"]
            I --> J[Verification Service]
            J --> L[MockComplianceProvider]
            L --> M[(Government CNG Registry<br/>SQLite 584 Vehicles)]
            L -- Fuzzy Matcher Dist <= 2 --> M
            J --> O[(Audit & Idempotency Store)]
        end

        J --> N
    end
```

---

## 🔬 How the System Works Internally

### 1. Dual-Stage ANPR Pipeline
1. **License Plate Localization (`yolo_plate_detector.py`)**:
   - Uses a fine-tuned **YOLO11 Nano** model (`yolo11n_plate.pt`) optimized for CPU inference.
   - Falls back to an **Indian ALPR YOLOv8** model (`indian_alpr_yolo8.pt`) if confidence is below 0.40.
   - If both neural detectors miss, an **OpenCV contour aspect-ratio filter** locates standard Indian rectangular plates ($2.0 \le \text{aspect ratio} \le 6.0$).
   - Adds a 6% boundary margin around detected bounding boxes to preserve border characters from clipping.
2. **Image Preprocessing (`preprocessor.py`)**:
   - Generates multi-scale grayscale, adaptive binarization, bilateral denoising, and CLAHE contrast variants to handle nighttime glare, shadow, and reflection.
3. **Character Recognition (`paddle_ocr_adapter.py`)**:
   - Runs EasyOCR across image variants with locally cached weights (`craft_mlt_25k.pth` and `english_g2.pth`) to prevent online runtime downloads.

### 2. Indian Registration Normalizer (`registration_normalizer.py`)
Standard Indian plates follow the statutory format:  
`[State: 2 Letters] [RTO: 1-2 Digits] [Series: 0-3 Letters] [Number: 4 Digits]` (e.g., `HR 55 AZ 6100`) or Bharat Series (`22 BH 1234 AA`).
- Strips HSRP hologram country markers (`IND`, `INDIA`).
- Applies strict positional character correction:
  - First 2 characters: forced to letters (e.g. `0` $\to$ `O`, `1` $\to$ `I`).
  - Digits 3–4 (RTO): forced to numbers (e.g. `S` $\to$ `5`, `O` $\to$ `0`).
  - Digits 7–10 (Number): forced to numbers (e.g. `B` $\to$ `8`, `Z` $\to$ `2`).

### 3. Intelligent Fuzzy Tolerance Matching (`mock_compliance_provider.py`)
Taking photos of vehicle plates or computer screens often introduces glare, angle skew, or moiré patterns that cause 1–2 character OCR misreads.
- When an exact match on `registration_no` is not found, the compliance provider performs a **Levenshtein edit distance analysis** across all 584 records in the registry.
- If the closest candidate has an edit distance $\le 2$ (or $\le 3$ for 10-character plates), the system automatically links the query to the correct vehicle record and flags `matched_via_fuzzy: true`.

### 4. Statutory Government CNG Registry Schema
The SQLite registry (`compliance.db`) models official Vahan and PESO fields:
| Field | Type | Description |
| :--- | :--- | :--- |
| `registration_no` | `TEXT PRIMARY KEY` | Normalized plate string (e.g. `HR55AZ6100`) |
| `maker_model` | `TEXT` | Vehicle brand and model (e.g. `Maruti Suzuki Dzire Tour S CNG`) |
| `vehicle_class` | `TEXT` | `MOTOR CAB`, `BUS`, `AUTO RICKSHAW`, `PRIVATE CAR` |
| `fuel_type` | `TEXT` | `CNG`, `PETROL/CNG`, `DIESEL/CNG` |
| `cylinder_serial_no` | `TEXT` | PESO cylinder serial number |
| `cylinder_water_capacity_liters` | `INTEGER` | Water volume capacity (e.g. `60`, `140`) |
| `last_hydro_test_date` | `TEXT (ISO)` | Date of last test |
| `next_hydro_test_due` | `TEXT (ISO)` | Date when hydro-test validity expires |
| `testing_agency` | `TEXT` | Government-authorized testing station name |
| `compliance_status` | `TEXT` | `COMPLIANT`, `EXPIRED`, `ILLEGAL` |
| `fueling_permission` | `TEXT` | `ALLOWED` or `PROHIBITED_REFUEL_LOCKOUT` |

---

## 🚀 Quickstart & Running the System

### Prerequisites
- Docker & Docker Compose
- Android SDK (for mobile app compilation)
- Node.js 18+ and npm

### 1. Launch Backend & Public Cloudflare Tunnel
Start the containers using Docker Compose:
```bash
docker compose up -d
```
Verify running containers:
```bash
docker ps
```
Both `cng-compliance-backend` and `cng-compliance-tunnel` will start automatically.

Check the tunnel URL in the container logs:
```bash
docker logs cng-compliance-tunnel 2>&1 | grep "trycloudflare.com"
```
Test the health endpoint:
```bash
curl -s http://localhost:8000/health
# Output: {"status":"ok"}
```

Interactive OpenAPI Swagger documentation is available at:
```
http://localhost:8000/docs
```

---

## 📱 Mobile App (Android APK)

The ready-to-install Android APK is compiled in the repository root:
- **APK Location**: [`app-debug.apk`](file:///data/Projects/CNG/app-debug.apk) (17 MB)

### Installation
1. Transfer `app-debug.apk` to any Android phone (via WhatsApp, Google Drive, USB, or `adb install -r app-debug.apk`).
2. Open the app. The top header will display **`ONLINE`** with green status and roundtrip latency.
3. Tap **"SCAN & VERIFY"** or select a photo from your gallery.

### Rebuilding the Mobile App
If you update endpoints or UI code:
```bash
# 1. Bundle React Native JavaScript assets
cd mobile-v2
npx react-native bundle --platform android --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res

# 2. Compile APK
cd android
export ANDROID_HOME=/data/Android/Sdk
./gradlew assembleDebug

# 3. Copy to project root
cp app/build/outputs/apk/debug/app-debug.apk /data/Projects/CNG/app-debug.apk
```

---

## 📂 Repository Map

```
CNG/
├── app-debug.apk                   # Pre-compiled, ready-to-install Android APK
├── docker-compose.yml              # Multi-container orchestration (Backend + Tunnel)
├── backend/                        # FastAPI Enterprise Python service
│   ├── data/compliance.db          # Authoritative 584-record SQLite registry
│   ├── scripts/                    # Registry generator & diagnostics
│   └── src/app/
│       ├── adapters/               # YOLO detector, EasyOCR, DB repos
│       ├── api/routes/             # /ocr and /verifications endpoints
│       ├── domain/                 # Models, exceptions, normalizer
│       └── services/               # Verification & compliance rules engine
├── mobile-v2/                      # React Native Android client
│   ├── android/                    # Native Android gradle project
│   ├── src/components/             # ComplianceResultView, Modals, Camera HUD
│   ├── src/screens/                # CameraTestScreen
│   ├── src/types/                  # TypeScript compliance interfaces
│   └── src/utils/                  # Settings, history, haptics
├── models/
│   ├── easyocr/                    # Offline cached EasyOCR weights
│   └── yolo/                       # Fine-tuned YOLO11 plate detector models
├── sample-data/                    # MoRTH / PESO registry in CSV & JSON
├── Photos/                         # Test vehicle & compliance plate dataset
│   └── low_contrast_plates/        # Filtered metal AIS-028 plates
└── docs/                           # Architecture specs, security, & ADRs
```

---

## 📄 License & Compliance Notice

This system enforces compliance standards mandated by the **Ministry of Road Transport and Highways (MoRTH)**, **Petroleum and Explosives Safety Organization (PESO)**, and **AIS-028** gas cylinder safety standards. Designed for deployment across authorized city gas distribution (CGD) networks (e.g. GAIL Gas, IGL, MGL).
