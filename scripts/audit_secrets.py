import os
import re
import sys

# Regex pattern matching high-entropy secrets, hardcoded passwords, and AWS keys
SECRET_PATTERNS = [
    (re.compile(r"AKIA[0-9A-Z]{16}"), "AWS Access Key ID"),
    (re.compile(r"([^A-Z0-9]|^)(?i:aws_secret_access_key|secret_key)\s*=\s*['\"][A-Za-z0-9/+=]{30,}['\"]"), "AWS Secret Key"),
    (re.compile(r"-----BEGIN " + r"PRIVATE KEY-----"), "Private Key"),
    (re.compile(r"postgres://[a-zA-Z0-9_]+:[^@\s]+@"), "Hardcoded Database Credentials"),
]

EXCLUDE_DIRS = {".git", ".mypy_cache", ".pytest_cache", ".ruff_cache", "node_modules", "venv", ".idea"}


def scan_file(file_path: str) -> list[tuple[int, str, str]]:
    findings = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            for line_idx, line in enumerate(f, start=1):
                for pattern, desc in SECRET_PATTERNS:
                    if pattern.search(line):
                        findings.append((line_idx, desc, line.strip()))
    except Exception:
        pass
    return findings


def main() -> None:
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print(f"Scanning codebase for secrets in: {root_dir}")
    total_findings = 0

    for dirpath, dirnames, filenames in os.walk(root_dir):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fname in filenames:
            file_path = os.path.join(dirpath, fname)
            findings = scan_file(file_path)
            if findings:
                print(f"\n[!] Potential Secret Found in: {file_path}")
                for line_no, desc, snippet in findings:
                    print(f"    Line {line_no}: [{desc}] {snippet[:60]}...")
                    total_findings += 1

    if total_findings == 0:
        print("\nSUCCESS: Secrets audit passed! Zero hardcoded secrets detected in source control.")
        sys.exit(0)
    else:
        print(f"\nFAILURE: Secrets audit failed with {total_findings} potential finding(s).")
        sys.exit(1)


if __name__ == "__main__":
    main()
