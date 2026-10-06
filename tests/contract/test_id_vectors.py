"""
Golden card-id and term-match vectors shared with the frontend (tests/js/ids.test.ts
reads the same file). Every value is computed by the contract's own code on the real
SDK Keccak256.

Regenerate:  WRITE_VECTORS=1 python3 -m pytest tests/contract/test_id_vectors.py
"""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VECTORS = ROOT / "tests" / "js" / "id-vectors.json"
CONTRACT = str(ROOT / "contracts" / "WordSense.py")

OWNER = "0x3065E31B1D993d7C0D59E6786844cBa56780B2d3"
CARDS = [
    ("bank", "the land along the side of a river"),
    ("bank", "a business that keeps and lends money"),
    ("  Bank ", " the land   along the side\tof a river "),
    ("take off", "of a plane: to leave the ground"),
    ("\u001cpitch\u001f", "a sports field\u0085for football"),
    ("café", "a small restaurant 　serving coffee"),
    ("﻿spring", "the season after winter"),
    ("naïve", "lacking experience \U0001F331"),
]
MATCHES = [
    ("We sat on the bank and watched the boats drift past.", "bank"),
    ("The bank's new card.", "bank"),
    ("BANK holiday", "bank"),
    ("We banked the fire before bed.", "bank"),
    ("The banks were full.", "bank"),
    ("A riverbank path.", "bank"),
    ("The bank-side path.", "bank"),
    ("The plane will take   off soon.", "take off"),
    ("takeoff was smooth", "take off"),
    ("Le café est ouvert.", "café"),
    ("Le cafés sont ouverts.", "café"),
    ("bankbank bank", "bank"),
    ("Ébank and bank2", "bank"),
    ("", "bank"),
]


def build(contract):
    cards = []
    for term, sense in CARDS:
        t = contract._normalize_text(term.strip())
        s = contract._normalize_text(sense.strip())
        cards.append({"term": term, "sense": sense, "card_id": contract._card_id(OWNER, t, s)})
    matches = [{"sentence": s, "term": t, "uses": contract._uses_term(s, t)} for s, t in MATCHES]
    used = [{"sentence": s, "key": contract._used_key("ab" * 32, s)} for s in ("We sat on the bank.", "  WE SAT on  the bank. ")]
    return {"owner": OWNER, "cards": cards, "matches": matches, "used": used}


def test_vectors_match_contract(direct_deploy):
    data = build(direct_deploy(CONTRACT))
    if os.environ.get("WRITE_VECTORS") == "1":
        VECTORS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    assert json.loads(VECTORS.read_text(encoding="utf-8")) == data
