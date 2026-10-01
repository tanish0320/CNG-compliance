import re
from dataclasses import dataclass

# Official list of valid Indian State / Union Territory plate prefixes
VALID_INDIAN_STATES = {
    "AN", "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN",
    "GA", "GJ", "HR", "HP", "JH", "JK", "KA", "KL", "LA", "LD",
    "MH", "ML", "MN", "MP", "MZ", "NL", "OD", "PB", "PY", "RJ",
    "SK", "TN", "TR", "TS", "UK", "UP", "WB"
}

# Regex matching Indian Vehicle Registration numbers (standard state plates & BH series)
# Standard: State (2 letters) + RTO Code (1-2 digits) + Series (0-3 letters) + Number (4 digits)
INDIAN_PLATE_PATTERN = re.compile(
    r"^([A-Z]{2})([0-9]{1,2})([A-Z]{0,3})([0-9]{4})$"
)

BHARAT_SERIES_PATTERN = re.compile(
    r"^([0-9]{2})(BH)([0-9]{4})([A-Z]{1,2})$"
)


@dataclass(frozen=True, slots=True)
class NormalizedRegistration:
    raw_text: str
    normalized_plate: str
    formatted_plate: str
    is_valid: bool


class IndianRegistrationNormalizer:
    """Normalizes and validates Indian vehicle registration strings."""

    @staticmethod
    def normalize(raw_text: str) -> NormalizedRegistration:
        if not raw_text or not raw_text.strip():
            return NormalizedRegistration(
                raw_text=raw_text,
                normalized_plate="",
                formatted_plate="NO_PLATE_DETECTED",
                is_valid=False,
            )

        # 1. Convert to uppercase
        clean = raw_text.upper()

        # 2. Remove HSRP country markers ("IND", "INDIA")
        clean = re.sub(r"\bIND\b|\bINDIA\b", "", clean)
        clean = clean.replace("IND", "")

        # 3. Remove all non-alphanumeric characters
        clean = re.sub(r"[^A-Z0-9]", "", clean)

        # 4. Apply positional OCR character confusion correction first
        fixed_clean = IndianRegistrationNormalizer._fix_ocr_confusions(clean)
        fixed_res = IndianRegistrationNormalizer._try_match(raw_text, fixed_clean)
        if fixed_res:
            return fixed_res

        # 5. Attempt direct standard match on cleaned text
        direct_res = IndianRegistrationNormalizer._try_match(raw_text, clean)
        if direct_res:
            return direct_res

        # 6. Attempt Bharat Series (BH) match
        bh_match = BHARAT_SERIES_PATTERN.match(clean)
        if bh_match:
            year, bh, num, series = bh_match.groups()
            normalized = f"{year}{bh}{num}{series}"
            formatted = f"{year} {bh} {num} {series}"
            return NormalizedRegistration(
                raw_text=raw_text,
                normalized_plate=normalized,
                formatted_plate=formatted,
                is_valid=True,
            )

        # 7. Fallback search for embedded plate ONLY if state prefix is valid
        embedded_search = re.search(r"([A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4})", clean)
        if embedded_search:
            candidate = embedded_search.group(1)
            candidate_fixed = IndianRegistrationNormalizer._fix_ocr_confusions(candidate)
            emb_res = IndianRegistrationNormalizer._try_match(raw_text, candidate_fixed)
            if emb_res:
                return emb_res
            emb_direct = IndianRegistrationNormalizer._try_match(raw_text, candidate)
            if emb_direct:
                return emb_direct

        # Non-matching or invalid text
        return NormalizedRegistration(
            raw_text=raw_text,
            normalized_plate=clean,
            formatted_plate=clean if clean else "NO_PLATE_DETECTED",
            is_valid=False,
        )

    @staticmethod
    def _try_match(raw_text: str, candidate_text: str) -> NormalizedRegistration | None:
        std_match = INDIAN_PLATE_PATTERN.match(candidate_text)
        if std_match:
            state, rto, series, num = std_match.groups()
            # Enforce valid Indian State/UT prefix whitelist
            if state not in VALID_INDIAN_STATES:
                return None

            rto_formatted = f"{int(rto):02d}"
            normalized = f"{state}{rto_formatted}{series}{num}"
            formatted = f"{state}{rto_formatted} {series}{num}".replace("  ", " ").strip()
            return NormalizedRegistration(
                raw_text=raw_text,
                normalized_plate=normalized,
                formatted_plate=formatted,
                is_valid=True,
            )

        bh_match = BHARAT_SERIES_PATTERN.match(candidate_text)
        if bh_match:
            year, bh, num, series = bh_match.groups()
            normalized = f"{year}{bh}{num}{series}"
            formatted = f"{year} {bh} {num} {series}"
            return NormalizedRegistration(
                raw_text=raw_text,
                normalized_plate=normalized,
                formatted_plate=formatted,
                is_valid=True,
            )

        return None

    @staticmethod
    def _fix_ocr_confusions(text: str) -> str:
        """Fix common OCR character confusions using strict positional roles for Indian plates."""
        if len(text) < 8 or len(text) > 13:
            return text

        to_letters = {'0': 'O', '1': 'I', '5': 'S', '8': 'B', '2': 'Z'}
        to_digits = {'O': '0', 'Q': '0', 'I': '1', 'L': '1', 'T': '1', 'S': '5', 'B': '8', 'Z': '2', 'G': '6'}

        chars = list(text)

        # 1. State code (chars 0..1): Must be letters
        for i in (0, 1):
            if chars[i] in to_letters:
                chars[i] = to_letters[chars[i]]

        # Strict 10-character standard plate positional fixing:
        # Format: [State: 0..1 letters] [RTO: 2..3 digits] [Series: 4..5 letters] [Number: 6..9 digits]
        if len(chars) == 10:
            state_code = "".join(chars[:2])
            if state_code in VALID_INDIAN_STATES:
                # Pos 2..3 (RTO digits)
                for i in (2, 3):
                    if chars[i] in to_digits:
                        chars[i] = to_digits[chars[i]]
                # Pos 4..5 (Series letters)
                for i in (4, 5):
                    if chars[i] in to_letters:
                        chars[i] = to_letters[chars[i]]
                # Pos 6..9 (Number digits)
                for i in range(6, 10):
                    if chars[i] in to_digits:
                        chars[i] = to_digits[chars[i]]
                return "".join(chars)

        # Generic positional fixing for non-10 length strings
        for i in range(len(chars) - 4, len(chars)):
            if chars[i] in to_digits:
                chars[i] = to_digits[chars[i]]

        if len(chars) >= 9:
            for i in (2, 3):
                if chars[i] in to_digits:
                    chars[i] = to_digits[chars[i]]

        return "".join(chars)
