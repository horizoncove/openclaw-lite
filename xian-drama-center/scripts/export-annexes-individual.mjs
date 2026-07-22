/**
 * Export each annex HTML to a lean ASCII-named PDF.
 */
import { chromium } from "playwright";
import { mkdir, copyFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const HTML_DIR = path.join(ROOT, "docs", "attachments", "html");
const OUT_DIR = path.join(ROOT, "docs", "attachments");
const ART = "/opt/cursor/artifacts";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(ART, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  for (const letter of LETTERS) {
    const html = path.join(HTML_DIR, `annex-${letter}.html`);
    const out = path.join(OUT_DIR, `annex-${letter}.pdf`);
    const page = await browser.newPage();
    await page.goto(`file://${html}`, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(800);
    await page.pdf({
      path: out,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });
    await page.close();
    await copyFile(out, path.join(ART, `annex-${letter}.pdf`));
    console.log("wrote", `annex-${letter}.pdf`);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
