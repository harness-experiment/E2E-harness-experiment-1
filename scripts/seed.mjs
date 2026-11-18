import { chromium } from "@playwright/test";
import { setup, create, P1, P2, P3 } from "../tests/helpers.js";
const browser = await chromium.launch();
try {
  const { a, b } = await setup(browser);
  await create(a, P1);
  await create(b, P2);
  await create(a, P3);
} finally {
  await browser.close();
}
