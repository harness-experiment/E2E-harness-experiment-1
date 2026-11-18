import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { A, login, create, request, snapshot, EDIT } from "../tests/helpers.js";
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:15173",
  });
  const before = await snapshot();
  await login(context, A);
  const post = await create(context, {
    title: "복구 검사",
    body: "복구 후 정상 쓰기",
  });
  const updated = await request(context, "PUT", `/posts/${post.id}`, EDIT);
  const deleted = await request(context, "DELETE", `/posts/${post.id}`);
  const after = await snapshot();
  const passed =
    updated.status() === 200 &&
    deleted.status() === 204 &&
    JSON.stringify(before) === JSON.stringify(after);
  const fault = JSON.parse(readFileSync("evidence/fault.json", "utf8"));
  fault.authenticatedRecovery = {
    passed,
    updateStatus: updated.status(),
    deleteStatus: deleted.status(),
    preservedExistingPosts: JSON.stringify(before) === JSON.stringify(after),
  };
  fault.passed = fault.passed && passed;
  writeFileSync("evidence/fault.json", JSON.stringify(fault, null, 2));
  if (!passed) throw new Error("Authenticated recovery failed");
  console.log("Authenticated recovery passed");
} finally {
  await browser.close();
}
