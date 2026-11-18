import { spawn, execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  openSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const runtime = resolve(root, ".runtime");
const pidFile = resolve(runtime, "app.pid");
const jar = resolve(root, "backend/build/libs/backend.jar");
const health = "http://127.0.0.1:18081/actuator/health";
mkdirSync(runtime, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function start() {
  if (existsSync(pidFile))
    throw new Error("PID file already exists. Check status before starting.");
  try {
    await fetch(health);
    throw new Error("Port 18081 is already in use.");
  } catch (error) {
    if (error.message.includes("already")) throw error;
  }
  const log = openSync(resolve(runtime, "app.log"), "a", 0o600);
  const child = spawn("java", ["-jar", jar], {
    cwd: root,
    detached: true,
    stdio: ["ignore", log, log],
  });
  writeFileSync(pidFile, String(child.pid));
  child.unref();
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if ((await fetch(health)).ok) {
        console.log("App ready");
        return;
      }
    } catch {
      /* Wait for startup. */
    }
    await sleep(500);
  }
  throw new Error("App did not become ready in 30 seconds.");
}

async function stop() {
  if (!existsSync(pidFile)) throw new Error("No managed app PID.");
  const pid = Number(readFileSync(pidFile, "utf8"));
  const command = execFileSync("ps", ["-p", String(pid), "-o", "args="], {
    encoding: "utf8",
  });
  if (!command.includes(jar))
    throw new Error("PID does not belong to this trial app.");
  process.kill(pid, "SIGTERM");
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      process.kill(pid, 0);
      const state = execFileSync("ps", ["-p", String(pid), "-o", "stat="], {
        encoding: "utf8",
      });
      if (state.trim().startsWith("Z")) throw new Error("Exited child");
    } catch {
      unlinkSync(pidFile);
      console.log("App stopped");
      return;
    }
    await sleep(250);
  }
  throw new Error("App has not stopped.");
}

const action = process.argv[2];
if (action === "start") await start();
else if (action === "stop") await stop();
else if (action === "restart") {
  await stop();
  await start();
} else throw new Error("Use start, stop or restart.");
