import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { database } from "../tests/helpers.js";

const before = await database(
  "SELECT id,author_id,title,body FROM posts ORDER BY id",
);
const preflight = await (
  await fetch("http://127.0.0.1:19091/api/v1/query?query=up")
).json();
if (
  !preflight.data.result.some(
    (series) => series.metric.job === "board-trial1" && series.value[1] === "1",
  )
) {
  throw new Error(
    "Prometheus must observe a healthy trial app before fault injection.",
  );
}
const started = Date.now();
execFileSync("node", ["scripts/app.mjs", "stop"]);
const prometheus = "http://127.0.0.1:19091/api/v1/query?query=";
let detected;
for (let attempt = 0; attempt < 30; attempt++) {
  const result = await (
    await fetch(prometheus + encodeURIComponent('up{job="board-trial1"}'))
  ).json();
  if (result.data.result.some((series) => series.value[1] === "0")) {
    detected = Date.now();
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
const recoveryStarted = Date.now();
execFileSync("node", ["scripts/app.mjs", "start"], { timeout: 40000 });
const recovered = Date.now();
const after = await database(
  "SELECT id,author_id,title,body FROM posts ORDER BY id",
);
const response = await fetch("http://127.0.0.1:18081/api/posts");
const posts = await response.json();
const result = {
  started: new Date(started).toISOString(),
  detectionMs: detected ? detected - started : null,
  recoveryMs: recovered - recoveryStarted,
  persistence: JSON.stringify(before) === JSON.stringify(after),
  publicRead: response.ok && posts.length === before.length,
  before,
  after,
};
result.passed =
  result.detectionMs !== null &&
  result.detectionMs <= 30000 &&
  result.recoveryMs <= 60000 &&
  result.persistence &&
  result.publicRead;
writeFileSync("evidence/fault.json", JSON.stringify(result, null, 2));
console.log(
  JSON.stringify({ ...result, before: before.length, after: after.length }),
);
if (!result.passed) process.exitCode = 1;
