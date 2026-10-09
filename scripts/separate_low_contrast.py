import json
import os
import shutil

def separate_low_contrast_photos(results_json="scripts/diagnostics_results.json", target_dir="Photos/low_contrast_plates"):
    if not os.path.exists(results_json):
        print(f"Diagnostics results file {results_json} not found.")
        return []

    with open(results_json, "r") as fp:
        results = json.load(fp)

    os.makedirs(target_dir, exist_ok=True)
    
    flagged = []
    for r in results:
        if r.get("is_low_contrast"):
            flagged.append(r)
            
    print(f"\n=======================================================")
    print(f"  FOUND {len(flagged)} LOW-CONTRAST / SAME-COLOR CANDIDATES")
    print(f"=======================================================\n")
    print(f"{'Idx':<4} | {'Filename':<38} | {'Plate/Text':<18} | {'Delta-E':<7} | {'Michelson':<9} | {'Gray Std'}")
    print("-" * 95)
    
    copied_files = []
    for f in flagged:
        fname = f["filename"]
        src_path = os.path.join("Photos", fname)
        dst_path = os.path.join(target_dir, fname)
        
        metrics = f.get("metrics", {})
        de = metrics.get("delta_e_color_diff", 0.0)
        mc = metrics.get("michelson_contrast", 0.0)
        gs = metrics.get("gray_std", 0.0)
        text_disp = f.get("formatted_registration", "") or f.get("raw_text", "")[:16]
        
        print(f"{f['index']:<4} | {fname:<38} | {text_disp:<18} | {de:<7.2f} | {mc:<9.3f} | {gs:<.2f}")
        
        if os.path.exists(src_path):
            shutil.copy2(src_path, dst_path)
            copied_files.append(fname)
            
    print("-" * 95)
    print(f"\nSuccessfully copied {len(copied_files)} low-contrast photos to: {target_dir}/\n")
    return flagged

if __name__ == "__main__":
    separate_low_contrast_photos()
