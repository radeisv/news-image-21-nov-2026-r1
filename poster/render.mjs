// render.mjs — news-image-20261121, ROUND 1 (fresh, written in-session).
// Screenshots poster/poster.html in headless Chrome via the DevTools
// protocol at exactly 1024x1024, probes the layout for overflow, then
// re-encodes the shot as RGB with Pillow so repeated runs are byte-identical.
// Node stdlib only; the only external programs are the local Chrome binary
// and python3 + Pillow, both already on this machine.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const htmlFile = join(here, "poster.html");
const tmpPng = join(tmpdir(), "news21-r1-shot.png");
const entryPng = join(here, "entry.png");

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const cache = join(homedir(), ".cache", "ms-playwright");
  for (const name of readdirSync(cache).sort()) {
    const cand = join(cache, name, "chrome-linux", "chrome");
    if (existsSync(cand)) return cand;
  }
  throw new Error("no Chrome binary in the Playwright cache");
}

class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.seq = 0;
    this.waiting = new Map();
    this.ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      const slot = this.waiting.get(m.id);
      if (!slot) return;
      this.waiting.delete(m.id);
      if (m.error) slot.reject(new Error(JSON.stringify(m.error)));
      else slot.resolve(m.result);
    };
    this.open = new Promise((ok, fail) => { this.ws.onopen = ok; this.ws.onerror = fail; });
  }
  async send(method, params = {}) {
    await this.open;
    const id = ++this.seq;
    const p = new Promise((ok, fail) => this.waiting.set(id, { resolve: ok, reject: fail }));
    this.ws.send(JSON.stringify({ id, method, params }));
    return p;
  }
  async js(expr) {
    const r = await this.send("Runtime.evaluate", { expression: expr, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }
}

async function main() {
  const chrome = findChrome();
  const port = 9800 + (process.pid % 70);
  const profile = join(tmpdir(), `news21-r1-${process.pid}`);
  const proc = spawn(chrome, ["--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
  try {
    let pages;
    for (let i = 0; i < 60; i++) {
      try { pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; }
      catch { await new Promise((r) => setTimeout(r, 200)); }
    }
    if (!pages) throw new Error("DevTools never came up");
    const target = pages.find((t) => t.type === "page");
    const cdp = new CDP(target.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1024, height: 1024, deviceScaleFactor: 1, mobile: false });
    await cdp.send("Page.navigate", { url: "file://" + htmlFile });
    await new Promise((r) => setTimeout(r, 1500));
    const layout = await cdp.js(`(() => {
      const page = document.querySelector(".page");
      const bad = [];
      for (const sel of ["header", ".strip", ".regions", ".leads", ".feats", ".maprow", ".briefs", ".datecheck", "footer"]) {
        const el = document.querySelector(sel);
        if (!el) { bad.push(sel + " missing"); continue; }
        if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) bad.push(sel + " sh=" + el.scrollHeight + " ch=" + el.clientHeight);
      }
      document.querySelectorAll(".lead,.feat,.briefs p").forEach((el, i) => {
        if (el.scrollHeight > el.clientHeight + 1) bad.push(el.className + "[" + i + "] sh=" + el.scrollHeight + " ch=" + el.clientHeight);
      });
      return { h: page.scrollHeight, w: page.scrollWidth, bad };
    })()`);
    console.log("LAYOUT", JSON.stringify(layout));
    if (layout.h !== 1024 || layout.w !== 1024) throw new Error(`page is ${layout.w}x${layout.h}, want 1024x1024`);
    if (layout.bad.length) throw new Error("overflow: " + layout.bad.join(" | "));
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(tmpPng, Buffer.from(shot.data, "base64"));
    console.log("RAW_SHOT_BYTES:", statSync(tmpPng).size);
  } finally { proc.kill(); }
  const py = `
from PIL import Image
import os
img = Image.open(${JSON.stringify(tmpPng)}).convert("RGB")
assert img.size == (1024, 1024), img.size
img.save(${JSON.stringify(entryPng)}, optimize=True)
print("ENTRY_PNG_BYTES:", os.path.getsize(${JSON.stringify(entryPng)}))
`;
  execFileSync("python3", ["-c", py], { stdio: "inherit" });
}
main().catch((e) => { console.error(e); process.exit(1); });
