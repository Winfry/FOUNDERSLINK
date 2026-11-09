// Starts all of FoundersLink with one command, from the repository root:
//
//   npm run start:all             everything
//   npm run start:all -- --no-ai  everything except the AI service
//   npm run start:all -- --check  only checks, and says what it would start
//
// The AI service, the backend and the staff dashboard print their lines here,
// each with its name in front. The app (Expo) prints its QR code below them:
// scan it with Expo Go. Ctrl+C stops everything.
//
// Nothing is installed or changed: it only starts what is already set up,
// and says in plain words when something is missing.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const windows = process.platform === "win32";
const skipAi = process.argv.includes("--no-ai");
const checkOnly = process.argv.includes("--check");

const colour = { ai: 35, backend: 36, dashboard: 33, app: 32, start: 1 };
function say(who, line) {
  const tag = `[${who}]`.padEnd(12);
  process.stdout.write(`\x1b[${colour[who] ?? 0}m${tag}\x1b[0m ${line}\n`);
}

// The database address from backend/.env, to check it is running first.
function databaseAddress() {
  try {
    const env = readFileSync(join(root, "backend", ".env"), "utf8");
    const url = env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
    const { hostname, port } = new URL(url);
    return { host: hostname, port: Number(port || 5432) };
  } catch {
    return null;
  }
}

function reachable({ host, port }) {
  return new Promise((done) => {
    const socket = net.connect({ host, port, timeout: 3000 });
    socket.once("connect", () => { socket.destroy(); done(true); });
    socket.once("timeout", () => { socket.destroy(); done(false); });
    socket.once("error", () => done(false));
  });
}

const children = [];

// Prints a program's output line by line with its name in front, and calls
// `watch` on each line so readiness can be announced in plain words.
function run(who, command, args, cwd, watch = () => {}) {
  const child = spawn(command, args, { cwd, shell: windows, env: { ...process.env, FORCE_COLOR: "1" } });
  children.push(child);
  for (const stream of [child.stdout, child.stderr]) {
    let rest = "";
    stream.on("data", (chunk) => {
      const lines = (rest + chunk.toString()).split(/\r?\n/);
      rest = lines.pop();
      for (const line of lines) {
        if (!line.trim() || /Loading weights/.test(line)) continue;
        say(who, line);
        watch(line);
      }
    });
  }
  child.on("exit", (code) => {
    if (!stopping) say(who, `stopped (exit code ${code}). The others keep running; Ctrl+C stops them all.`);
  });
  return child;
}

let stopping = false;
function stopAll() {
  if (stopping) return;
  stopping = true;
  say("start", "Stopping everything...");
  for (const child of children) {
    if (child.exitCode !== null || !child.pid) continue;
    // On Windows a program started through the shell has children of its
    // own; only taskkill /T stops the whole family.
    if (windows) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGINT");
  }
  setTimeout(() => process.exit(0), 500);
}
process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

// A part that is already running (in another terminal) is left alone:
// starting it twice would fail with "address already in use".
async function alreadyRunning(who, port, name) {
  if (await reachable({ host: "127.0.0.1", port })) {
    say(who, `${name} is already running (port ${port}), so it is left as it is.`);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------

const db = databaseAddress();
if (!db) {
  say("start", "backend/.env is missing or has no DATABASE_URL. Copy .env.example and fill it in first.");
  process.exit(1);
}
if (!(await reachable(db))) {
  say("start", `The database is not running (nothing answers at ${db.host}:${db.port}).`);
  say("start", "Open Docker Desktop, wait until it says it is running, then try again.");
  process.exit(1);
}
say("start", `Database found at ${db.host}:${db.port}.`);

for (const part of ["backend", "admin", "mobile"]) {
  if (!existsSync(join(root, part, "node_modules"))) {
    say("start", `${part}/ is not installed. Run: cd ${part} && npm install, then try again.`);
    process.exit(1);
  }
}

const python = join(root, "ai", ".venv", windows ? "Scripts/python.exe" : "bin/python");
const running = {
  ai: !skipAi && (await alreadyRunning("ai", 8001, "The AI service")),
  backend: await alreadyRunning("backend", 8000, "The backend"),
  dashboard: await alreadyRunning("dashboard", 3000, "The staff dashboard"),
  app: await alreadyRunning("app", 8081, "The app (Expo)"),
};
if (checkOnly) {
  say("start", "Check only (--check): nothing was started.");
  say("start", `Would start: ${["ai", "backend", "dashboard", "app"].filter((k) => !running[k] && !(k === "ai" && (skipAi || !existsSync(python)))).join(", ") || "nothing"}.`);
  process.exit(0);
}
if (running.ai) {
  // Already running: nothing to start.
} else if (skipAi) {
  say("start", "Not starting the AI service (--no-ai). Ask Compliance will only be able to say it cannot confirm.");
} else if (!existsSync(python)) {
  say("start", "The AI service is not set up (no ai/.venv), so it is not started. See ai/README.md.");
} else {
  let announced = false;
  run("ai", python, ["-m", "uvicorn", "ai.service.main:app", "--host", "127.0.0.1", "--port", "8001"], root, (line) => {
    if (/Application startup complete/.test(line)) {
      say("ai", "AI service is up. Ask Compliance still needs about a minute to find Google before it writes answers.");
    }
    if (!announced && /Found \S+ in [\d.]+s/.test(line)) {
      announced = true;
      say("ai", ">>> Ask Compliance is ready: it will now write answers.");
    }
    if (/LLM_API_KEY or LLM_MODEL is not set/.test(line)) {
      say("ai", "No Gemini key in the .env file: Ask Compliance will quote the official text instead of writing answers.");
    }
  });
}

if (!running.backend) {
  run("backend", "npm", ["run", "dev"], join(root, "backend"), (line) => {
    if (/listening on/i.test(line)) say("backend", ">>> Backend is ready.");
  });
}
if (!running.dashboard) {
  run("dashboard", "npm", ["run", "dev"], join(root, "admin"), (line) => {
    if (/https?:\/\/\S+:3000/.test(line)) {
      say("dashboard", ">>> Staff dashboard is ready: open http://localhost:3000 (on your phone: this computer's address, port 3000).");
    }
  });
}

// Expo needs the real terminal to draw its QR code and take its keys
// (r reloads, w opens the web version), so it is not given a name tag.
if (running.app) {
  say("app", "Use the QR code in the terminal where the app is already running.");
  if (children.length === 0) {
    say("start", "Everything was already running. Nothing to do.");
    process.exit(0);
  }
  say("start", "Press Ctrl+C to stop what this command started.");
} else {
  say("app", "Starting the app. Its QR code appears below: scan it with Expo Go on your phone.");
  const app = spawn("npx", ["expo", "start"], { cwd: join(root, "mobile"), shell: windows, stdio: "inherit" });
  children.push(app);
  app.on("exit", () => { if (!stopping) stopAll(); });
}
