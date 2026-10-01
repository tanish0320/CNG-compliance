import pytest
from app.domain.registration_normalizer import IndianRegistrationNormalizer


def test_normalize_rj32_ind_gd9600() -> None:
    raw = "RJ32 IND GD9600"
    res = IndianRegistrationNormalizer.normalize(raw)
    assert res.normalized_plate == "RJ32GD9600"
    assert res.formatted_plate == "RJ32 GD9600"
    assert res.is_valid is True

    raw_confusable = "RJ3z IND GD9600"
    res_conf = IndianRegistrationNormalizer.normalize(raw_confusable)
    assert res_conf.normalized_plate == "RJ32GD9600"
    assert res_conf.formatted_plate == "RJ32 GD9600"
    assert res_conf.is_valid is True


def test_normalize_standard_plates() -> None:
    test_cases = [
        ("KA01AB1234", "KA01AB1234", "KA01 AB1234"),
        ("MH-12-DE-1234", "MH12DE1234", "MH12 DE1234"),
        ("DL 01 AB 1234", "DL01AB1234", "DL01 AB1234"),
        ("IND MH12DE1234", "MH12DE1234", "MH12 DE1234"),
        ("22BH1234AB", "22BH1234AB", "22 BH 1234 AB"),
        ("RJ 32  GD 9600", "RJ32GD9600", "RJ32 GD9600"),
    ]

    for raw, expected_norm, expected_fmt in test_cases:
        res = IndianRegistrationNormalizer.normalize(raw)
        assert res.normalized_plate == expected_norm
        assert res.formatted_plate == expected_fmt
        assert res.is_valid is True


def test_normalize_hr55az6100_bad_capture() -> None:
    raw = "IND HRSSA 26100"
    res = IndianRegistrationNormalizer.normalize(raw)
    assert res.normalized_plate == "HR55AZ6100"
    assert res.formatted_plate == "HR55 AZ6100"
    assert res.is_valid is True


def test_reject_invalid_state_prefix_sa026100() -> None:
    # Explicitly test that SA026100 is NOT accepted as a valid Indian registration
    res_sa = IndianRegistrationNormalizer.normalize("SA026100")
    assert res_sa.is_valid is False

    res_ind_sa = IndianRegistrationNormalizer.normalize("IND SA026100")
    assert res_ind_sa.is_valid is False

    res_xx = IndianRegistrationNormalizer.normalize("XX99YY9999")
    assert res_xx.is_valid is False


def test_normalize_invalid_text() -> None:
    res = IndianRegistrationNormalizer.normalize("PEPSI CAN")
    assert res.is_valid is False
    assert res.formatted_plate != "RJ32 GD9600"
    assert res.normalized_plate == "PEPSICAN"

    res_empty = IndianRegistrationNormalizer.normalize("")
    assert res_empty.is_valid is False
    assert res_empty.formatted_plate == "NO_PLATE_DETECTED"
    assert res_empty.normalized_plate == ""
