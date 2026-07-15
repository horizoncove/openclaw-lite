from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools.compile_knowledge import compile_bundle, parse_document


class KnowledgeCompilerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name) / "knowledge"
        self.source = self.root / "skills"
        self.source.mkdir(parents=True)
        self.skill = self.source / "sample.md"
        self.skill.write_text(
            """---
name: sample
version: "1.0"
type: reasoning_methodology
status: active
source: user-provided
---

# Sample

Evidence first.
""",
            encoding="utf-8",
        )
        self.output = self.root / "compiled" / "knowledge_base.json"

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_compiles_deterministic_bundle_and_check_mode(self) -> None:
        self.assertTrue(compile_bundle(self.source, self.output))
        first = self.output.read_bytes()
        self.assertTrue(compile_bundle(self.source, self.output, check=True))
        self.assertTrue(compile_bundle(self.source, self.output))
        self.assertEqual(first, self.output.read_bytes())

        bundle = json.loads(first)
        self.assertEqual(bundle["document_count"], 1)
        self.assertEqual(bundle["documents"][0]["id"], "sample@1.0")
        self.assertIn("Evidence first.", bundle["documents"][0]["content"])

    def test_rejects_missing_required_metadata(self) -> None:
        self.skill.write_text("---\nname: sample\n---\nbody\n", encoding="utf-8")

        with self.assertRaisesRegex(ValueError, "缺少元数据"):
            parse_document(self.skill, self.root)


if __name__ == "__main__":
    unittest.main()
