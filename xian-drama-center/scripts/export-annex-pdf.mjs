/**
 * Export the complete annex package HTML to PDF.
 */
import { chromium } from "playwright";
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HTML = path.join(ROOT, "docs", "完整资料包.html");
const OUT_ARTIFACT =
  process.env.PDF_OUT ||
  "/opt/cursor/artifacts/xian-weiduanju-complete-annex.pdf";
const OUT_REPO = path.join(ROOT, "docs", "西安微短剧产业服务中心完整详细资料包.pdf");

async function main() {
  await mkdir(path.dirname(OUT_ARTIFACT), { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage({
    viewport: { width: 1240, height: 1754 },
  });
  await page.goto(`file://${HTML}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.pdf({
    path: OUT_ARTIFACT,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
  });
  await browser.close();
  await copyFile(OUT_ARTIFACT, OUT_REPO);
  console.log("Wrote", OUT_ARTIFACT);
  console.log("Copied", OUT_REPO);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
