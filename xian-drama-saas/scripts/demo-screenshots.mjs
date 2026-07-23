/**
 * Capture SaaS demo screenshots for walkthrough.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.DEMO_URL || "http://127.0.0.1:5173";
const OUT = process.env.DEMO_OUT || "/opt/cursor/artifacts/saas-demo";

const pages = [
  { name: "01-login", path: "/login", before: null },
  {
    name: "02-dashboard",
    path: "/",
    before: async (page) => {
      await page.goto(`${BASE}/login`);
      await page.getByRole("button", { name: /主任办/ }).click();
      await page.waitForURL("**/");
    },
  },
  { name: "03-orders", path: "/orders" },
  { name: "04-alliance-members", path: "/alliance/members" },
  { name: "05-alliance-matching", path: "/alliance/matching" },
  { name: "06-approval", path: "/centers/approval" },
  { name: "07-overseas", path: "/centers/overseas" },
  { name: "08-distribution", path: "/centers/distribution" },
  { name: "09-copyright", path: "/centers/copyright" },
  { name: "10-ai", path: "/centers/ai" },
  { name: "11-kpi", path: "/kpi" },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  for (const step of pages) {
    if (step.before) await step.before(page);
    else if (step.name !== "01-login") {
      // already logged in from dashboard step
      await page.goto(`${BASE}${step.path}`, { waitUntil: "networkidle" });
    } else {
      await page.goto(`${BASE}${step.path}`, { waitUntil: "networkidle" });
    }
    await page.waitForTimeout(500);
    const file = path.join(OUT, `${step.name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log("shot", file);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
