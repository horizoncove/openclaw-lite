#!/usr/bin/env python3
"""Extract each annex section into standalone HTML and prepare for PDF export."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs" / "完整资料包.html"
OUT_DIR = ROOT / "docs" / "attachments" / "html"
CSS = """
:root {
  --ink:#1c1917; --muted:#57534e; --line:#d6d3d1; --bg:#fafaf9;
  --accent:#9a3412; --accent-soft:#fed7aa; --blue:#1e3a5f; --ok:#166534; --warn:#92400e;
}
*{box-sizing:border-box;margin:0;padding:0}
@page{size:A4;margin:14mm 12mm}
body{font-family:"Noto Sans SC",sans-serif;color:var(--ink);font-size:10pt;line-height:1.6;padding:2mm}
h1,h2,h3,h4{font-family:"Noto Serif SC",serif;font-weight:700;line-height:1.35}
.section>h2, h2.doc-title{
  font-size:15pt;color:var(--blue);border-bottom:2px solid var(--accent);
  padding-bottom:2mm;margin-bottom:4mm;
}
h3{font-size:12pt;color:var(--accent);margin:5mm 0 2mm}
h4{font-size:10.5pt;color:var(--blue);margin:3.5mm 0 1.5mm}
p{margin-bottom:2mm}
ul,ol{padding-left:5mm;margin-bottom:2.5mm}
li{margin-bottom:1mm}
.lead{background:var(--bg);border-left:3px solid var(--accent);padding:3mm 3.5mm;margin:2.5mm 0 4mm;color:var(--muted)}
table{width:100%;border-collapse:collapse;margin:2.5mm 0 4mm;font-size:9pt}
th,td{border:1px solid var(--line);padding:1.8mm 2mm;vertical-align:top;text-align:left}
th{background:#f5f5f4;color:var(--blue);font-weight:600}
.tag{display:inline-block;background:var(--accent-soft);color:var(--accent);font-size:8pt;padding:.3mm 1.8mm;margin-right:1mm}
.muted{color:var(--muted)}
.ok{color:var(--ok);font-weight:600}
.warn{color:var(--warn);font-weight:600}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin:2mm 0}
.card{border:1px solid var(--line);background:var(--bg);padding:2.5mm}
.card h4{margin-top:0}
.footer-note{margin-top:6mm;padding-top:2.5mm;border-top:1px solid var(--line);font-size:8pt;color:var(--muted)}
.small{font-size:8.5pt}
.meta{font-size:9pt;color:var(--muted);margin-bottom:4mm}
"""

ANNEXES = [
    ("A", "组织章程与会员管理办法"),
    ("B", "服务产品目录与收费公益边界"),
    ("C", "90天甘特图与岗位说明书"),
    ("D", "预算明细表与采购清单"),
    ("E", "数据安全与脱敏管理办法"),
    ("F", "六大板块SOP操作手册"),
    ("G", "KPI考核评分表与周报月报模板"),
    ("H", "试点项目遴选标准与台账模板"),
    ("I", "联席会议制度与权责边界说明书"),
    ("J", "风险应急预案与合规底线清单"),
]


def main() -> None:
    html = SRC.read_text(encoding="utf-8")
    # Split by section headers that start attachments
    pattern = re.compile(
        r'<section class="section">\s*<h2>(附件 [A-J].*?)</h2>(.*?)(?=<section class="section">|\Z)',
        re.S,
    )
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    found = {}
    for m in pattern.finditer(html):
        title = re.sub(r"\s+", " ", m.group(1)).strip()
        body = m.group(2).strip()
        letter = re.search(r"附件 ([A-J])", title).group(1)
        found[letter] = (title, body)

    for letter, cn in ANNEXES:
        if letter not in found:
            raise SystemExit(f"missing annex {letter}")
        title, body = found[letter]
        # remove page-break class wrappers leftovers
        body = body.replace('class="section"', "")
        doc = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<title>{title}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@600;700&display=swap" rel="stylesheet"/>
<style>{CSS}</style>
</head>
<body>
<p class="meta">西安微短剧产业服务中心建设汇报方案 · 附件 {letter} · V1.0</p>
<h2 class="doc-title">{title}</h2>
{body}
</body>
</html>
"""
        path = OUT_DIR / f"annex-{letter}.html"
        path.write_text(doc, encoding="utf-8")
        print("wrote", path.name, "chars", len(doc))

    # index for browser preview
    items = "\n".join(
        f'<li><a href="annex-{letter}.html" target="_blank">附件 {letter}　{cn}</a> · '
        f'<a href="../annex-{letter}.pdf">PDF</a></li>'
        for letter, cn in ANNEXES
    )
    index = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"/><title>附件预览索引</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&family=Noto+Serif+SC:wght@700&display=swap" rel="stylesheet"/>
<style>
body{{font-family:"Noto Sans SC",sans-serif;max-width:860px;margin:40px auto;padding:0 20px;color:#1c1917;line-height:1.7}}
h1{{font-family:"Noto Serif SC",serif;color:#1e3a5f;border-bottom:2px solid #9a3412;padding-bottom:8px}}
li{{margin:10px 0}} a{{color:#9a3412}}
.note{{background:#fafaf9;border-left:3px solid #9a3412;padding:12px 14px;color:#57534e;margin:20px 0}}
</style></head><body>
<h1>西安微短剧产业服务中心 · 附件预览</h1>
<p class="note">若 GitHub PDF 无法在线预览，请点击下方 HTML 在线阅读，或下载英文文件名 PDF（annex-A.pdf …）。</p>
<ul>
{items}
<li><a href="annex-K.html" target="_blank">附件 K　可执行表格模板</a> · <a href="../annex-K.pdf">PDF</a></li>
</ul>
</body></html>
"""
    (OUT_DIR / "index.html").write_text(index, encoding="utf-8")
    print("wrote index.html")


if __name__ == "__main__":
    main()
