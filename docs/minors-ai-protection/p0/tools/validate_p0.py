#!/usr/bin/env python3
"""Validate P0 draft assets before freeze review."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = ROOT / "examples"
GOLDEN = ROOT / "golden" / "golden_set.jsonl"
LABELS_YAML = ROOT / "schema" / "labels.yaml"
SEVERITY_YAML = ROOT / "schema" / "severity.yaml"
LAW = ROOT / "law_mapping.csv"

MVP_LABELS = [
    "age_probe",
    "privacy_request",
    "contact_request",
    "school_request",
    "photo_request",
    "offline_meeting",
    "emotional_manipulation",
    "threat",
]


def count_numbered_items(text: str, header: str) -> int:
    lines = text.splitlines()
    mode = False
    n = 0
    for line in lines:
        if line.startswith(header):
            mode = True
            continue
        if mode and line.startswith("## "):
            break
        if mode and re.match(r"^\d+\.\s+", line.strip()):
            n += 1
    return n


def load_yaml_keys(path: Path, key: str) -> set[str]:
    # Minimal parse to avoid PyYAML dependency: collect "key: value" under labels list
    text = path.read_text(encoding="utf-8")
    if key == "labels":
        return set(re.findall(r"^\s+- key:\s*(\w+)", text, flags=re.M))
    if key == "default_label_level":
        block = False
        keys = set()
        for line in text.splitlines():
            if line.startswith("default_label_level:"):
                block = True
                continue
            if block:
                if re.match(r"^[A-Za-z]", line):
                    break
                m = re.match(r"^\s+(\w+):\s*S[0-4]", line)
                if m:
                    keys.add(m.group(1))
        return keys
    return set()


def main() -> int:
    errors: list[str] = []

    # examples
    for label in MVP_LABELS:
        path = EXAMPLES / f"{label}.md"
        if not path.exists():
            errors.append(f"missing example file: {path.name}")
            continue
        text = path.read_text(encoding="utf-8")
        pos = count_numbered_items(text, "## 正例")
        neg = count_numbered_items(text, "## 易混负例")
        if pos < 20:
            errors.append(f"{label}: positive examples {pos} < 20")
        if neg < 10:
            errors.append(f"{label}: negative examples {neg} < 10")

    # yaml keys
    label_keys = load_yaml_keys(LABELS_YAML, "labels")
    sev_keys = load_yaml_keys(SEVERITY_YAML, "default_label_level")
    if label_keys != set(MVP_LABELS):
        errors.append(f"labels.yaml keys mismatch: {sorted(label_keys)}")
    if sev_keys != set(MVP_LABELS):
        errors.append(f"severity.yaml default keys mismatch: {sorted(sev_keys)}")

    # law mapping
    law_lines = LAW.read_text(encoding="utf-8").strip().splitlines()
    if len(law_lines) - 1 < 20:
        errors.append(f"law_mapping rows {len(law_lines)-1} < 20")

    # golden set
    if not GOLDEN.exists():
        errors.append("missing golden_set.jsonl")
    else:
        rows = []
        for i, line in enumerate(GOLDEN.read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip():
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError as e:
                errors.append(f"golden L{i}: {e}")
                continue
            for k in ("id", "text", "labels", "expected_level", "reason_codes"):
                if k not in obj:
                    errors.append(f"golden {obj.get('id','?')}: missing {k}")
            for lab in obj.get("labels", []):
                if lab not in MVP_LABELS:
                    errors.append(f"golden {obj.get('id')}: unknown label {lab}")
            if obj.get("expected_level") not in {"S0", "S1", "S2", "S3", "S4"}:
                errors.append(f"golden {obj.get('id')}: bad level")
            rows.append(obj)
        if len(rows) < 40:
            errors.append(f"golden size {len(rows)} < 40")
        # coverage: each label appears at least once as positive
        covered = set()
        for r in rows:
            covered.update(r["labels"])
        missing = set(MVP_LABELS) - covered
        if missing:
            errors.append(f"golden missing label coverage: {sorted(missing)}")

    if errors:
        print("P0 VALIDATE FAIL")
        for e in errors:
            print(" -", e)
        return 1

    print("P0 VALIDATE PASS")
    print(f" - examples: 8 labels × (>=20 pos, >=10 neg)")
    print(f" - law_mapping: {len(law_lines)-1} rows")
    print(f" - golden: ok")
    print(f" - schema keys: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
