#!/usr/bin/env python3
"""Split the annex pack into per-attachment PDFs and export the table template."""

from __future__ import annotations

from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
ATTACH = DOCS / "attachments"
ARTIFACTS = Path("/opt/cursor/artifacts")

ANNEX = DOCS / "西安微短剧产业服务中心完整详细资料包.pdf"

# 1-based inclusive page ranges from the annex pack
SPLITS = [
    ("附件A-组织章程与会员管理办法", 3, 4),
    ("附件B-服务产品目录与收费公益边界", 5, 6),
    ("附件C-90天甘特图与岗位说明书", 7, 8),
    ("附件D-预算明细表与采购清单", 9, 10),
    ("附件E-数据安全与脱敏管理办法", 11, 11),
    ("附件F-六大板块SOP操作手册", 12, 13),
    ("附件G-KPI考核评分表与周报月报模板", 14, 15),
    ("附件H-试点项目遴选标准与台账模板", 16, 16),
    ("附件I-联席会议制度与权责边界说明书", 17, 17),
    ("附件J-风险应急预案与合规底线清单", 18, 18),
]


def split_annex() -> list[Path]:
    ATTACH.mkdir(parents=True, exist_ok=True)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    src = fitz.open(ANNEX.as_posix())
    outputs: list[Path] = []
    for name, start, end in SPLITS:
        out = fitz.open()
        out.insert_pdf(src, from_page=start - 1, to_page=end - 1)
        path = ATTACH / f"{name}.pdf"
        out.save(path.as_posix())
        art = ARTIFACTS / f"xian-{name}.pdf"
        out.save(art.as_posix())
        out.close()
        outputs.append(path)
        print(f"wrote {path.name} pages={end - start + 1}")
    src.close()
    return outputs


def export_table_template() -> Path:
    md = (ATTACH / "表格模板.md").read_text(encoding="utf-8")
    # Simple markdown-ish to HTML for print
    lines = md.splitlines()
    html_parts = [
        "<!DOCTYPE html><html lang='zh-CN'><head><meta charset='UTF-8'/>",
        "<title>表格模板</title>",
        "<link href='https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@700&display=swap' rel='stylesheet'/>",
        "<style>",
        "body{font-family:'Noto Sans SC',sans-serif;font-size:10pt;line-height:1.55;color:#1c1917;padding:8mm;}",
        "h1{font-family:'Noto Serif SC',serif;font-size:18pt;color:#1e3a5f;border-bottom:2px solid #9a3412;padding-bottom:2mm;}",
        "h2{font-family:'Noto Serif SC',serif;font-size:13pt;color:#9a3412;margin:5mm 0 2mm;}",
        "table{width:100%;border-collapse:collapse;margin:2mm 0 4mm;font-size:8pt;}",
        "th,td{border:1px solid #d6d3d1;padding:1.5mm;vertical-align:top;}",
        "th{background:#f5f5f4;color:#1e3a5f;}",
        "pre{background:#f5f5f4;padding:3mm;white-space:pre-wrap;font-size:9pt;}",
        "p{margin:2mm 0;}",
        "</style></head><body>",
    ]
    in_table = False
    in_code = False
    for line in lines:
        if line.startswith("```"):
            if in_code:
                html_parts.append("</pre>")
                in_code = False
            else:
                html_parts.append("<pre>")
                in_code = True
            continue
        if in_code:
            html_parts.append(line.replace("&", "&amp;").replace("<", "&lt;") + "\n")
            continue
        if line.startswith("# "):
            html_parts.append(f"<h1>{line[2:].strip()}</h1>")
            continue
        if line.startswith("## "):
            if in_table:
                html_parts.append("</table>")
                in_table = False
            html_parts.append(f"<h2>{line[3:].strip()}</h2>")
            continue
        if line.startswith("|") and "|" in line[1:]:
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if all(set(c) <= set("-: ") and c for c in cells):
                continue  # separator
            tag = "th" if not in_table else "td"
            if not in_table:
                html_parts.append("<table>")
                in_table = True
                tag = "th"
            html_parts.append("<tr>" + "".join(f"<{tag}>{c}</{tag}>" for c in cells) + "</tr>")
            continue
        if in_table:
            html_parts.append("</table>")
            in_table = False
        if line.strip():
            html_parts.append(f"<p>{line}</p>")
    if in_table:
        html_parts.append("</table>")
    if in_code:
        html_parts.append("</pre>")
    html_parts.append("</body></html>")
    html_path = ATTACH / "表格模板.html"
    html_path.write_text("".join(html_parts), encoding="utf-8")
    return html_path


def main() -> None:
    split_annex()
    html = export_table_template()
    print("table html", html)


if __name__ == "__main__":
    main()
