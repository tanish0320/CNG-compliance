import os
import re

import pytest

DOCS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "docs"))
INFRA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "infra"))


@pytest.mark.asyncio
async def test_no_destructive_alembic_downgrade_in_production_docs() -> None:
    """Ensure production deployment/DR docs do NOT instruct operators to run destructive Alembic downgrades."""
    destructive_pattern = re.compile(r"alembic\s+downgrade", re.IGNORECASE)

    for base_dir in [DOCS_DIR, INFRA_DIR]:
        if not os.path.exists(base_dir):
            continue
        for root, _, files in os.walk(base_dir):
            for file in files:
                if file.endswith((".md", ".txt", ".yml", ".yaml")):
                    file_path = os.path.join(root, file)
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:  # noqa: ASYNC230
                        for line_idx, line in enumerate(f, start=1):
                            if destructive_pattern.search(line):
                                lower_line = line.lower()
                                assert (
                                    "non-production" in lower_line
                                    or "dev" in lower_line
                                    or "not" in lower_line
                                    or "avoid" in lower_line
                                    or "warning" in lower_line
                                    or "forward-only" in lower_line
                                ), f"Destructive alembic downgrade command found in production document {file_path}:{line_idx}"
