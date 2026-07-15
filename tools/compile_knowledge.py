#!/usr/bin/env python3
"""Compile Markdown knowledge skills into a deterministic JSON bundle."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


REQUIRED_METADATA = ("name", "version", "type", "status", "source")


def parse_document(path: Path, root: Path) -> dict[str, object]:
    content = path.read_text(encoding="utf-8")
    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        raise ValueError(f"{path}: 缺少 YAML front matter")
    try:
        end = lines.index("---", 1)
    except ValueError as exc:
        raise ValueError(f"{path}: front matter 未闭合") from exc

    metadata: dict[str, str] = {}
    for line in lines[1:end]:
        if not line.strip():
            continue
        if ":" not in line:
            raise ValueError(f"{path}: 无效元数据行: {line}")
        key, value = line.split(":", 1)
        metadata[key.strip()] = value.strip().strip('"').strip("'")
    missing = [key for key in REQUIRED_METADATA if not metadata.get(key)]
    if missing:
        raise ValueError(f"{path}: 缺少元数据 {', '.join(missing)}")

    body = "\n".join(lines[end + 1 :]).strip() + "\n"
    return {
        "id": f"{metadata['name']}@{metadata['version']}",
        "path": path.relative_to(root).as_posix(),
        "metadata": metadata,
        "sha256": hashlib.sha256(content.encode("utf-8")).hexdigest(),
        "content": body,
    }


def compile_bundle(source: Path, output: Path, *, check: bool = False) -> bool:
    root = source.parent
    paths = sorted(source.glob("*.md"))
    if not paths:
        raise ValueError(f"{source}: 没有可编译的 Markdown 技能")
    documents = [parse_document(path, root) for path in paths]
    ids = [document["id"] for document in documents]
    if len(ids) != len(set(ids)):
        raise ValueError("知识库存在重复技能 ID")

    bundle = {
        "schema_version": 1,
        "document_count": len(documents),
        "documents": documents,
    }
    serialized = json.dumps(
        bundle, ensure_ascii=False, indent=2, sort_keys=True
    ) + "\n"
    if check:
        return output.exists() and output.read_text(encoding="utf-8") == serialized
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(serialized, encoding="utf-8")
    return True


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="编译 Sharon 方法论知识库")
    parser.add_argument(
        "--source", type=Path, default=Path("knowledge/skills")
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("knowledge/compiled/knowledge_base.json"),
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="只检查已编译文件是否为最新，不写文件",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    valid = compile_bundle(args.source, args.output, check=args.check)
    if args.check and not valid:
        print("知识库编译产物已过期")
        return 1
    action = "检查通过" if args.check else "编译完成"
    print(f"知识库{action}: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
