#!/usr/bin/env node
/** Build static GitHub Pages bundle under dist-pages/ (browser MVP, no Node API). */
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "dist-pages");

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const name of ["index.html", "styles.css", "app.js", "engine.js"]) {
  cpSync(path.join(ROOT, "public", name), path.join(OUT, name));
}
cpSync(path.join(ROOT, "public", "docs"), path.join(OUT, "docs"), { recursive: true });
mkdirSync(path.join(OUT, "sdk"), { recursive: true });
cpSync(path.join(ROOT, "sdk", "js", "minorguard.js"), path.join(OUT, "sdk", "minorguard.js"));

// Pages-friendly notes on doc pages: health hits same-origin API only when local.
const doubaoPath = path.join(OUT, "docs", "doubao.html");
let doubao = readFileSync(doubaoPath, "utf8");
if (!doubao.includes("GitHub Pages")) {
  doubao = doubao.replace(
    "<h1>豆包 / 火山方舟接入状态</h1>",
    `<h1>豆包 / 火山方舟接入状态</h1>
      <p><strong>GitHub Pages 静态演示</strong>默认使用浏览器本地规则。豆包云调用需自建 <code>apps/minorguard-api</code> 服务并配置 Key。</p>`,
  );
  writeFileSync(doubaoPath, doubao);
}

writeFileSync(
  path.join(OUT, "README.md"),
  `# MinorGuard 静态演示（GitHub Pages）

在线地址：<https://horizoncove.github.io/openclaw-lite/minorguard/>

## MVP 能力（纯浏览器）

- 对话样本分析（四类风险 + 未成年人可能性）
- 家长 / 平台 / 监管三视图报告
- 实时聊天风险检测与安全拒答
- 风险事件台账（localStorage）+ 导出
- 本地合成样本生成

云 LLM（豆包/DeepSeek）与 SQLite 台账需运行 Node API：\`apps/minorguard-api\`。
`,
);

writeFileSync(
  path.join(OUT, ".nojekyll"),
  "",
);

console.log(`built ${OUT}`);
