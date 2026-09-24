from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

required = [
    "README.md",
    "PROJECT_CONTEXT.md",
    "openapi/cng-compliance-openapi.yaml",
    "backend/src/app/main.py",
    "mobile/package.json",
    "architecture/system_architecture.mmd",
]

missing = [path for path in required if not (ROOT / path).exists()]
if missing:
    raise SystemExit(f"Missing required files: {missing}")

json.loads((ROOT / "config/rules.sample.json").read_text())
json.loads((ROOT / "sample-data/verification_valid.json").read_text())
json.loads((ROOT / "mobile/package.json").read_text())

print(f"Package OK: {ROOT}")
