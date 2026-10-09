import csv
import json
import os
import random
import sqlite3
import uuid
from datetime import datetime, timedelta

RTO_DISTRIBUTION = [
    ("DL", "01", "Central Delhi (Sheikh Sarai)"),
    ("DL", "03", "South Delhi (Sheikh Sarai)"),
    ("DL", "04", "West Delhi (Janakpuri)"),
    ("DL", "05", "North East Delhi (Loni Road)"),
    ("DL", "08", "North West Delhi (Wazirpur)"),
    ("DL", "10", "West Delhi (Raja Garden)"),
    ("DL", "12", "South West Delhi (Vasant Vihar)"),
    ("HR", "26", "Gurugram"),
    ("HR", "51", "Faridabad"),
    ("HR", "10", "Sonipat"),
    ("UP", "14", "Ghaziabad"),
    ("UP", "16", "Noida / Gautam Buddha Nagar"),
    ("UP", "32", "Lucknow"),
    ("MH", "01", "Mumbai Central"),
    ("MH", "02", "Mumbai West"),
    ("MH", "03", "Mumbai East"),
    ("MH", "04", "Thane"),
    ("MH", "12", "Pune"),
    ("MH", "14", "Pimpri-Chinchwad"),
    ("GJ", "01", "Ahmedabad"),
    ("GJ", "05", "Surat"),
    ("GJ", "06", "Vadodara"),
    ("GJ", "27", "Ahmedabad East"),
    ("KA", "01", "Bengaluru Central"),
    ("KA", "03", "Bengaluru East"),
    ("KA", "05", "Bengaluru South"),
    ("RJ", "14", "Jaipur"),
    ("RJ", "32", "Kotputli"),
]

VEHICLE_MODELS = [
    ("4W_CAB", "Maruti Suzuki WagonR Tour H3 CNG", "OEM_FITTED", 60),
    ("4W_CAB", "Maruti Suzuki Dzire Tour S CNG", "OEM_FITTED", 55),
    ("4W_CAB", "Hyundai Aura Prime CNG", "OEM_FITTED", 65),
    ("4W_CAB", "Tata Tigor EV/CNG Commercial", "RETROFITTED", 60),
    ("4W_PRIVATE", "Maruti Suzuki Brezza ZXi CNG", "OEM_FITTED", 55),
    ("4W_PRIVATE", "Maruti Suzuki Ertiga VXi CNG", "OEM_FITTED", 60),
    ("4W_PRIVATE", "Tata Tiago iCNG XT", "OEM_FITTED", 60),
    ("4W_PRIVATE", "Tata Punch iCNG Adventure", "OEM_FITTED", 60),
    ("4W_PRIVATE", "Hyundai Grand i10 Nios CNG", "OEM_FITTED", 60),
    ("4W_PRIVATE", "Toyota Urban Cruiser Hyryder CNG", "OEM_FITTED", 55),
    ("4W_PRIVATE", "Honda City 1.5 i-VTEC (CNG Kit)", "RETROFITTED", 65),
    ("4W_PRIVATE", "Hyundai Creta 1.5 (CNG Retrofit)", "RETROFITTED", 65),
    ("3W_AUTO", "Bajaj Compact RE 3-Seater CNG", "OEM_FITTED", 30),
    ("3W_AUTO", "Bajaj Maxima Z CNG Auto", "OEM_FITTED", 40),
    ("3W_AUTO", "Piaggio Ape Auto DX CNG", "OEM_FITTED", 35),
    ("3W_AUTO", "Mahindra Alfa DX CNG", "OEM_FITTED", 35),
    ("3W_AUTO", "TVS King Duramax CNG Auto", "OEM_FITTED", 35),
    ("LIGHT_COMMERCIAL_VEHICLE", "Tata Ace Gold CNG Mini Truck", "OEM_FITTED", 70),
    ("LIGHT_COMMERCIAL_VEHICLE", "Mahindra Supro CNG Maxi Truck", "OEM_FITTED", 75),
    ("LIGHT_COMMERCIAL_VEHICLE", "Maruti Suzuki Super Carry CNG", "OEM_FITTED", 70),
    ("BUS", "Tata Starbus Ultra CNG 32-Seater", "OEM_FITTED", 150),
    ("BUS", "Eicher Skyline Pro CNG School Bus", "OEM_FITTED", 140),
    ("BUS", "Ashok Leyland Oyster CNG City Bus", "OEM_FITTED", 180),
]

AUTHORIZED_TESTING_AGENCIES = [
    "IGL PESO-Certified Cylinder Testing Station Unit 1, Okhla, New Delhi",
    "IGL Cylinder Re-testing & Inspection Center, Mayapuri, New Delhi",
    "Mahanagar Gas Ltd Cylinder Hydro-Test Facility, Bandra-Kurla, Mumbai",
    "MGL Hydro Testing Station No. 4, Mahape, Navi Mumbai",
    "Adani Total Gas Authorized Testing Hub, Naroda, Ahmedabad",
    "Gujarat Gas Approved Testing Lab, Sachin GIDC, Surat",
    "Torrent Gas Testing Facility, Pune-Nashik Road, Pune",
    "Indraprastha Cylinder Safety Testing Authority, Ghaziabad UP",
    "Haryana City Gas Approved Hydro Test Unit, Sector 18, Gurugram",
    "Central Institute of Road Transport (CIRT) Automotive Lab, Pune",
]

KIT_MANUFACTURERS = [
    "Maruti Suzuki Factory OEM Gas Injection",
    "Tata Motors Advanced iCNG System",
    "Hyundai Motor India Factory Retro-Spec",
    "Tomasetto Achille S.p.A. Model AT09",
    "Minda AutoGas Sequential Direct Kit",
    "Motozen Sequential CNG Injection System",
    "Lovato Smart ExR OBD-II Sequential Kit",
    "BRC Gas Equipment Plug & Drive",
    "Zavoli Bora Direct CNG Kit",
]

ILLEGAL_REASONS = [
    ("UNAUTHORIZED_RETROFIT_KIT_RC_PETROL_ONLY", "IMPOUND_ALERT"),
    ("BLACKLISTED_CYLINDER_SERIAL", "IMPOUND_ALERT"),
    ("COUNTERFEIT_COMPLIANCE_PLATE", "IMPOUND_ALERT"),
    ("STOLEN_OR_SCRAPPED_VEHICLE", "IMPOUND_ALERT"),
]

def generate_random_plate(state: str, rto: str) -> tuple[str, str]:
    series = "".join(random.choices("ABCDEFGHJKLMNPRSTUVWXYZ", k=2))
    num = f"{random.randint(100, 9999):04d}"
    normalized = f"{state}{rto}{series}{num}"
    formatted = f"{state}{rto} {series}{num}"
    return normalized, formatted

def generate_chassis_engine(state: str, num: int) -> tuple[str, str]:
    chassis = f"MA3EYD{state}{num:04d}S00{random.randint(1000, 9999)}"
    engine = f"K10BN{random.randint(100000, 999999)}"
    return chassis, engine

def create_database(db_path: str):
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    cur.execute("""
    CREATE TABLE IF NOT EXISTS government_cng_registry (
        registration_no TEXT PRIMARY KEY,
        formatted_registration TEXT NOT NULL,
        state_code TEXT NOT NULL,
        rto_code TEXT NOT NULL,
        rto_name TEXT NOT NULL,
        vehicle_class TEXT NOT NULL,
        maker_model TEXT NOT NULL,
        fuel_type TEXT NOT NULL,
        chassis_no TEXT NOT NULL,
        engine_no TEXT NOT NULL,
        fitment_type TEXT NOT NULL,
        kit_serial_no TEXT,
        kit_manufacturer TEXT,
        cylinder_serial_no TEXT,
        cylinder_water_capacity_liters INTEGER,
        last_hydro_test_date TEXT,
        next_hydro_test_due TEXT,
        compliance_plate_no TEXT,
        testing_agency TEXT,
        fitness_valid_upto TEXT NOT NULL,
        insurance_valid_upto TEXT NOT NULL,
        puc_valid_upto TEXT NOT NULL,
        compliance_status TEXT NOT NULL,
        compliance_reason TEXT NOT NULL,
        fueling_permission TEXT NOT NULL,
        is_photo_source INTEGER NOT NULL DEFAULT 0,
        photo_filename TEXT,
        low_contrast_issue INTEGER NOT NULL DEFAULT 0,
        ocr_readable INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)
    
    cur.execute("CREATE INDEX IF NOT EXISTS idx_gov_reg_state ON government_cng_registry (state_code);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_gov_compliance_status ON government_cng_registry (compliance_status);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_gov_photo_source ON government_cng_registry (is_photo_source);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_gov_low_contrast ON government_cng_registry (low_contrast_issue);")
    
    conn.commit()
    conn.close()

def generate_synthetic_dataset(db_path: str, diagnostics_json: str | None = None, total_synthetic: int = 500):
    now = datetime.now()
    records = []
    seen_plates = set()
    
    # 1. Load photo diagnostics if available
    photo_diagnostics = []
    if diagnostics_json and os.path.exists(diagnostics_json):
        with open(diagnostics_json, "r") as f:
            photo_diagnostics = json.load(f)
            
    print(f"Loaded {len(photo_diagnostics)} photo diagnostic records.")
    
    # 2. Build records for the 84 photos
    photo_idx = 0
    for diag in photo_diagnostics:
        photo_idx += 1
        raw_norm = diag.get("normalized_registration", "")
        fmt_reg = diag.get("formatted_registration", "")
        fname = diag.get("filename", "")
        is_low_contrast = 1 if diag.get("is_low_contrast") else 0
        is_readable = 1 if (diag.get("is_valid_plate") and diag.get("ocr_confidence", 0) >= 0.80) else 0
        
        # If plate was detected, extract state & rto
        state = "DL"
        rto = "01"
        rto_name = "Central Delhi (Sheikh Sarai)"
        
        if len(raw_norm) >= 4 and raw_norm[:2].isalpha() and raw_norm[2:4].isdigit():
            state = raw_norm[:2]
            rto = raw_norm[2:4]
            # Match RTO name if possible
            for s, r, name in RTO_DISTRIBUTION:
                if s == state and r == rto:
                    rto_name = name
                    break
        else:
            # Fallback realistic plate assignment for undetected photo
            state, rto, rto_name = random.choice(RTO_DISTRIBUTION)
            raw_norm, fmt_reg = generate_random_plate(state, rto)
            
        # Ensure plate uniqueness
        if raw_norm in seen_plates:
            raw_norm = f"{raw_norm[:8]}{random.randint(10, 99)}"
            fmt_reg = f"{raw_norm[:4]} {raw_norm[4:]}"
        seen_plates.add(raw_norm)
        
        # Assign realistic status to photo vehicles: balanced mix
        # photo_idx % 3 == 0: COMPLIANT, 1: EXPIRED, 2: ILLEGAL
        status_mod = photo_idx % 3
        v_class, v_model, v_fit, v_cap = random.choice(VEHICLE_MODELS)
        chassis, engine = generate_chassis_engine(state, photo_idx)
        
        if status_mod == 0:
            c_status = "COMPLIANT"
            c_reason = "VALID_PESO_CERTIFICATION"
            fuel_perm = "ALLOWED"
            fuel_type = "PETROL/CNG" if v_fit == "RETROFITTED" else "CNG ONLY"
            fit_type = v_fit
            last_test = (now - timedelta(days=random.randint(60, 450))).strftime("%Y-%m-%d")
            next_due = (now + timedelta(days=random.randint(300, 900))).strftime("%Y-%m-%d")
            kit_serial = f"KIT-{state}-{random.randint(10000, 99999)}"
            kit_mfg = random.choice(KIT_MANUFACTURERS)
            cyl_serial = f"CYL-PESO-{random.randint(100000, 999999)}"
            plate_no = f"CNG-{state}-{raw_norm}"
            agency = random.choice(AUTHORIZED_TESTING_AGENCIES)
        elif status_mod == 1:
            c_status = "EXPIRED"
            c_reason = "HYDRO_TEST_OVERDUE"
            fuel_perm = "PROHIBITED_REFUEL_LOCKOUT"
            fuel_type = "PETROL/CNG"
            fit_type = "RETROFITTED"
            last_test = (now - timedelta(days=random.randint(1150, 1600))).strftime("%Y-%m-%d")
            next_due = (now - timedelta(days=random.randint(45, 450))).strftime("%Y-%m-%d")
            kit_serial = f"KIT-{state}-{random.randint(10000, 99999)}"
            kit_mfg = random.choice(KIT_MANUFACTURERS)
            cyl_serial = f"CYL-PESO-{random.randint(100000, 999999)}"
            plate_no = f"CNG-EXP-{state}-{random.randint(1000, 9999)}"
            agency = random.choice(AUTHORIZED_TESTING_AGENCIES)
        else:
            c_status = "ILLEGAL"
            reason_tuple = random.choice(ILLEGAL_REASONS)
            c_reason = reason_tuple[0]
            fuel_perm = reason_tuple[1]
            fit_type = "UNAUTHORIZED_RETROFIT"
            if c_reason == "UNAUTHORIZED_RETROFIT_KIT_RC_PETROL_ONLY":
                fuel_type = "PETROL"  # RC says petrol, but illegal kit fitted!
                kit_serial = None
                kit_mfg = "Unapproved Local Workshop"
                cyl_serial = f"NON-PESO-{random.randint(10000, 99999)}"
                plate_no = None
                agency = "None / Uncertified"
                last_test = None
                next_due = None
            else:
                fuel_type = "PETROL/CNG"
                kit_serial = f"KIT-TAMPERED-{random.randint(1000, 9999)}"
                kit_mfg = "Unknown"
                cyl_serial = f"BLACKLIST-{random.randint(10000, 99999)}"
                plate_no = f"CNG-FAKE-{random.randint(1000, 9999)}"
                agency = "Blacklisted Center"
                last_test = (now - timedelta(days=800)).strftime("%Y-%m-%d")
                next_due = (now - timedelta(days=200)).strftime("%Y-%m-%d")
                
        fitness = (now + timedelta(days=random.randint(180, 1000))).strftime("%Y-%m-%d")
        insurance = (now + timedelta(days=random.randint(60, 365))).strftime("%Y-%m-%d")
        puc = (now + timedelta(days=random.randint(30, 180))).strftime("%Y-%m-%d")
        
        rec = {
            "registration_no": raw_norm,
            "formatted_registration": fmt_reg,
            "state_code": state,
            "rto_code": rto,
            "rto_name": rto_name,
            "vehicle_class": v_class,
            "maker_model": v_model,
            "fuel_type": fuel_type,
            "chassis_no": chassis,
            "engine_no": engine,
            "fitment_type": fit_type,
            "kit_serial_no": kit_serial,
            "kit_manufacturer": kit_mfg,
            "cylinder_serial_no": cyl_serial,
            "cylinder_water_capacity_liters": v_cap,
            "last_hydro_test_date": last_test,
            "next_hydro_test_due": next_due,
            "compliance_plate_no": plate_no,
            "testing_agency": agency,
            "fitness_valid_upto": fitness,
            "insurance_valid_upto": insurance,
            "puc_valid_upto": puc,
            "compliance_status": c_status,
            "compliance_reason": c_reason,
            "fueling_permission": fuel_perm,
            "is_photo_source": 1,
            "photo_filename": fname,
            "low_contrast_issue": is_low_contrast,
            "ocr_readable": is_readable,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        records.append(rec)
        
    print(f"Generated {len(records)} records from photo diagnostics.")
    
    # 3. Generate remaining synthetic records up to total_synthetic (Balanced ~34% Compliant, 33% Expired, 33% Illegal)
    num_to_add = max(0, total_synthetic)
    target_compliant = int(num_to_add * 0.34)
    target_expired = int(num_to_add * 0.33)
    target_illegal = num_to_add - target_compliant - target_expired
    
    statuses = (
        ["COMPLIANT"] * target_compliant +
        ["EXPIRED"] * target_expired +
        ["ILLEGAL"] * target_illegal
    )
    random.shuffle(statuses)
    
    for idx, c_status in enumerate(statuses, 1):
        state, rto, rto_name = random.choice(RTO_DISTRIBUTION)
        raw_norm, fmt_reg = generate_random_plate(state, rto)
        while raw_norm in seen_plates:
            raw_norm, fmt_reg = generate_random_plate(state, rto)
        seen_plates.add(raw_norm)
        
        v_class, v_model, v_fit, v_cap = random.choice(VEHICLE_MODELS)
        chassis, engine = generate_chassis_engine(state, 1000 + idx)
        
        if c_status == "COMPLIANT":
            c_reason = "VALID_PESO_CERTIFICATION"
            fuel_perm = "ALLOWED"
            fuel_type = "PETROL/CNG" if v_fit == "RETROFITTED" else "CNG ONLY"
            fit_type = v_fit
            last_test = (now - timedelta(days=random.randint(60, 500))).strftime("%Y-%m-%d")
            next_due = (now + timedelta(days=random.randint(250, 950))).strftime("%Y-%m-%d")
            kit_serial = f"KIT-{state}-{random.randint(10000, 99999)}"
            kit_mfg = random.choice(KIT_MANUFACTURERS)
            cyl_serial = f"CYL-PESO-{random.randint(100000, 999999)}"
            plate_no = f"CNG-{state}-{raw_norm}"
            agency = random.choice(AUTHORIZED_TESTING_AGENCIES)
        elif c_status == "EXPIRED":
            c_reason = "HYDRO_TEST_OVERDUE" if random.random() < 0.8 else "FITNESS_CERTIFICATE_EXPIRED"
            fuel_perm = "PROHIBITED_REFUEL_LOCKOUT"
            fuel_type = "PETROL/CNG"
            fit_type = "RETROFITTED" if random.random() < 0.6 else "OEM_FITTED"
            last_test = (now - timedelta(days=random.randint(1150, 1600))).strftime("%Y-%m-%d")
            next_due = (now - timedelta(days=random.randint(30, 450))).strftime("%Y-%m-%d")
            kit_serial = f"KIT-{state}-{random.randint(10000, 99999)}"
            kit_mfg = random.choice(KIT_MANUFACTURERS)
            cyl_serial = f"CYL-PESO-{random.randint(100000, 999999)}"
            plate_no = f"CNG-EXP-{state}-{random.randint(1000, 9999)}"
            agency = random.choice(AUTHORIZED_TESTING_AGENCIES)
        else: # ILLEGAL
            reason_tuple = random.choice(ILLEGAL_REASONS)
            c_reason = reason_tuple[0]
            fuel_perm = reason_tuple[1]
            fit_type = "UNAUTHORIZED_RETROFIT"
            if c_reason == "UNAUTHORIZED_RETROFIT_KIT_RC_PETROL_ONLY":
                fuel_type = "PETROL" if random.random() < 0.85 else "DIESEL"
                kit_serial = None
                kit_mfg = "Unapproved Local Workshop"
                cyl_serial = f"NON-PESO-{random.randint(10000, 99999)}"
                plate_no = None
                agency = "None / Uncertified"
                last_test = None
                next_due = None
            else:
                fuel_type = "PETROL/CNG"
                kit_serial = f"KIT-TAMPERED-{random.randint(1000, 9999)}"
                kit_mfg = "Unknown / Counterfeit"
                cyl_serial = f"BLACKLIST-{random.randint(10000, 99999)}"
                plate_no = f"CNG-FAKE-{random.randint(1000, 9999)}"
                agency = "Blacklisted Testing Station"
                last_test = (now - timedelta(days=700)).strftime("%Y-%m-%d")
                next_due = (now - timedelta(days=150)).strftime("%Y-%m-%d")
                
        fitness = (now + timedelta(days=random.randint(90, 1100))).strftime("%Y-%m-%d")
        insurance = (now + timedelta(days=random.randint(30, 365))).strftime("%Y-%m-%d")
        puc = (now + timedelta(days=random.randint(20, 180))).strftime("%Y-%m-%d")
        
        rec = {
            "registration_no": raw_norm,
            "formatted_registration": fmt_reg,
            "state_code": state,
            "rto_code": rto,
            "rto_name": rto_name,
            "vehicle_class": v_class,
            "maker_model": v_model,
            "fuel_type": fuel_type,
            "chassis_no": chassis,
            "engine_no": engine,
            "fitment_type": fit_type,
            "kit_serial_no": kit_serial,
            "kit_manufacturer": kit_mfg,
            "cylinder_serial_no": cyl_serial,
            "cylinder_water_capacity_liters": v_cap,
            "last_hydro_test_date": last_test,
            "next_hydro_test_due": next_due,
            "compliance_plate_no": plate_no,
            "testing_agency": agency,
            "fitness_valid_upto": fitness,
            "insurance_valid_upto": insurance,
            "puc_valid_upto": puc,
            "compliance_status": c_status,
            "compliance_reason": c_reason,
            "fueling_permission": fuel_perm,
            "is_photo_source": 0,
            "photo_filename": None,
            "low_contrast_issue": 0,
            "ocr_readable": 1,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        records.append(rec)
        
    print(f"Total records prepared: {len(records)}")
    
    # Write to SQLite
    create_database(db_path)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    cols = list(records[0].keys())
    col_str = ", ".join(cols)
    placeholders = ", ".join(["?" for _ in cols])
    sql = f"INSERT OR REPLACE INTO government_cng_registry ({col_str}) VALUES ({placeholders})"
    
    for r in records:
        vals = [r[c] for c in cols]
        cur.execute(sql, vals)
        
    conn.commit()
    conn.close()
    print(f"Successfully inserted {len(records)} records into SQLite: {db_path}")
    
    # Write to JSON
    os.makedirs("sample-data", exist_ok=True)
    json_path = "sample-data/government_cng_registry.json"
    with open(json_path, "w") as fp:
        json.dump(records, fp, indent=2)
    print(f"Exported JSON dataset: {json_path}")
    
    # Write to CSV
    csv_path = "sample-data/government_cng_registry.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as fp:
        writer = csv.DictWriter(fp, fieldnames=cols)
        writer.writeheader()
        writer.writerows(records)
    print(f"Exported CSV dataset: {csv_path}")
    
    # Summary stats
    comp_c = sum(1 for r in records if r["compliance_status"] == "COMPLIANT")
    exp_c = sum(1 for r in records if r["compliance_status"] == "EXPIRED")
    ill_c = sum(1 for r in records if r["compliance_status"] == "ILLEGAL")
    photo_c = sum(1 for r in records if r["is_photo_source"] == 1)
    low_c = sum(1 for r in records if r["low_contrast_issue"] == 1)
    
    print("\n" + "=" * 60)
    print("        GOVERNMENT CNG REGISTRY SUMMARY         ")
    print("=" * 60)
    print(f"Total Registry Vehicles : {len(records)}")
    print(f"COMPLIANT Vehicles      : {comp_c} ({comp_c/len(records)*100:.1f}%)")
    print(f"EXPIRED Vehicles        : {exp_c} ({exp_c/len(records)*100:.1f}%)")
    print(f"ILLEGAL Vehicles        : {ill_c} ({ill_c/len(records)*100:.1f}%)")
    print(f"From Project Photos     : {photo_c}")
    print(f"Low Contrast / Same Clr : {low_c}")
    print("=" * 60)

if __name__ == "__main__":
    db_file = "backend/data/compliance.db"
    diag_file = "scripts/diagnostics_results.json"
    generate_synthetic_dataset(db_file, diag_file, total_synthetic=500)
