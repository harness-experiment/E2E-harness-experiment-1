import { chromium, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
const queries = {
  up: 'up{job="board-trial1"}',
  requests:
    'sum(rate(http_server_requests_seconds_count{job="board-trial1"}[1m]))',
  errors:
    '(sum(rate(http_server_requests_seconds_count{job="board-trial1",status=~"5.."}[1m])) or 0 * sum(rate(http_server_requests_seconds_count{job="board-trial1"}[1m]))) / clamp_min(sum(rate(http_server_requests_seconds_count{job="board-trial1"}[1m])),0.001)',
  latency:
    'histogram_quantile(0.95,sum by(le)(rate(http_server_requests_seconds_bucket{job="board-trial1"}[1m])))',
  memory: 'sum(jvm_memory_used_bytes{job="board-trial1"})',
  cpu: 'process_cpu_usage{job="board-trial1"}',
};
const results = {};
const end = Math.floor(Date.now() / 1000);
for (const [name, query] of Object.entries(queries)) {
  const url = new URL("http://127.0.0.1:19091/api/v1/query_range");
  url.search = new URLSearchParams({ query, start: end - 900, end, step: 2 });
  results[name] = await (await fetch(url)).json();
  if (results[name].status !== "success")
    throw new Error(`Query failed: ${name}`);
}
writeFileSync("evidence/monitoring.json", JSON.stringify(results, null, 2));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto("http://127.0.0.1:15173/");
  await expect(page.locator(".post-card")).toHaveCount(3);
  await page.screenshot({ path: "evidence/demo-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "evidence/demo-mobile.png", fullPage: true });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw new Error("Mobile overflow");
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto(
    "http://127.0.0.1:13001/d/board-trial1?orgId=1&from=now-15m&to=now&kiosk",
  );
  await expect(page.getByText("앱 가용성", { exact: true })).toBeVisible();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "evidence/grafana.png", fullPage: true });
} finally {
  await browser.close();
}
console.log(
  Object.fromEntries(
    Object.entries(results).map(([name, result]) => [
      name,
      result.data.result.length,
    ]),
  ),
);
