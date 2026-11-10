// Makes the app's logo files and icons in the purple brand, from the
// original two-people mark (assets/images/logo-mark.png, blue and navy on
// white). Run from mobile/:  node scripts/make-brand-assets.mjs
//
// The mark keeps its exact shapes: each pixel's blue becomes purple and its
// navy deep purple, and the white around it becomes transparent. The
// wordmark is set in the app's own font, Plus Jakarta Sans ExtraBold.
// Needs Playwright's Chromium (npx playwright install chromium), which the
// repository's tests already use; CHROME=<path> points at another one.

import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const mobile = join(here, "..");
const ORIGINAL = join(mobile, "assets/images/logo-mark-original.png");
const FONT = join(mobile, "node_modules/@expo-google-fonts/plus-jakarta-sans/800ExtraBold/PlusJakartaSans_800ExtraBold.ttf");

const BRAND = { purple: "#5634A5", deep: "#28184E", lavender: "#EEE9FB" };

const markData = "data:image/png;base64," + readFileSync(ORIGINAL).toString("base64");
const fontData = "data:font/ttf;base64," + readFileSync(FONT).toString("base64");

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage();
await page.setContent(`<style>@font-face{font-family:Brand;src:url(${fontData});font-weight:800}</style><span style="font-family:Brand">x</span>`);
await page.evaluate(() => document.fonts.ready);

const files = await page.evaluate(async ({ markData, BRAND }) => {
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [deep, purple] = [hex(BRAND.deep), hex(BRAND.purple)];

  const img = new Image();
  img.src = markData;
  await img.decode();

  // The mark in purple, on transparent, at its original size.
  const mark = document.createElement("canvas");
  mark.width = img.width;
  mark.height = img.height;
  const mctx = mark.getContext("2d");
  mctx.drawImage(img, 0, 0);
  const px = mctx.getImageData(0, 0, mark.width, mark.height);
  const d = px.data;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    // How much of the pixel is ink rather than white (edges are part-ink).
    const a = Math.min(1, Math.max(0, (255 - Math.min(r, g, b)) / 240));
    if (a < 0.04) { d[i + 3] = 0; continue; }
    // The ink colour without the white mixed in, then where it sits
    // between the navy (blue about 115) and the bright blue (about 219).
    const inkBlue = (b - 255 * (1 - a)) / a;
    const t = Math.min(1, Math.max(0, (inkBlue - 115) / (219 - 115)));
    d[i] = Math.round(deep[0] + (purple[0] - deep[0]) * t);
    d[i + 1] = Math.round(deep[1] + (purple[1] - deep[1]) * t);
    d[i + 2] = Math.round(deep[2] + (purple[2] - deep[2]) * t);
    d[i + 3] = Math.round(a * 255);
  }
  mctx.putImageData(px, 0, 0);

  const out = {};
  const save = (name, c) => { out[name] = c.toDataURL("image/png"); };
  const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  // The mark drawn to fit a box, centred.
  const drawMark = (ctx, x, y, w, h) => {
    const s = Math.min(w / mark.width, h / mark.height);
    const mw = mark.width * s, mh = mark.height * s;
    ctx.drawImage(mark, x + (w - mw) / 2, y + (h - mh) / 2, mw, mh);
  };

  save("assets/images/logo-mark.png", mark);

  // Wordmark: the mark, then "Founders" in deep purple and "Link" in purple.
  {
    const h = 318, size = 190, gap = 56;
    const probe = canvas(10, 10).getContext("2d");
    probe.font = `800 ${size}px Brand`;
    const w1 = probe.measureText("Founders").width, w2 = probe.measureText("Link").width;
    const c = canvas(Math.ceil(mark.width + gap + w1 + w2 + 24), h);
    const ctx = c.getContext("2d");
    ctx.drawImage(mark, 0, 0);
    ctx.font = `800 ${size}px Brand`;
    ctx.textBaseline = "alphabetic";
    const base = h / 2 + size * 0.36;
    ctx.fillStyle = BRAND.deep;
    ctx.fillText("Founders", mark.width + gap, base);
    ctx.fillStyle = BRAND.purple;
    ctx.fillText("Link", mark.width + gap + w1, base);
    save("assets/images/logo.png", c);
  }

  // App icon (iOS and stores): lavender square, the mark centred.
  { const c = canvas(1024, 1024), ctx = c.getContext("2d");
    ctx.fillStyle = BRAND.lavender; ctx.fillRect(0, 0, 1024, 1024);
    drawMark(ctx, 180, 200, 664, 624); save("assets/icon.png", c); }

  // Splash: the mark alone on transparent.
  { const c = canvas(1024, 1024), ctx = c.getContext("2d");
    drawMark(ctx, 212, 212, 600, 600); save("assets/splash-icon.png", c); }

  // Android adaptive icon: the mark inside the middle safe zone.
  { const c = canvas(512, 512), ctx = c.getContext("2d");
    drawMark(ctx, 136, 146, 240, 220); save("assets/android-icon-foreground.png", c); }
  { const c = canvas(512, 512), ctx = c.getContext("2d");
    ctx.fillStyle = BRAND.lavender; ctx.fillRect(0, 0, 512, 512); save("assets/android-icon-background.png", c); }
  // Monochrome (Android themed icons use only its shape): the mark in white.
  { const c = canvas(432, 432), ctx = c.getContext("2d");
    drawMark(ctx, 116, 124, 200, 184);
    ctx.globalCompositeOperation = "source-in"; ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, 432, 432);
    save("assets/android-icon-monochrome.png", c); }

  // Browser tab icon: a lavender rounded square with the mark.
  { const c = canvas(48, 48), ctx = c.getContext("2d");
    ctx.fillStyle = BRAND.lavender; ctx.beginPath(); ctx.roundRect(0, 0, 48, 48, 11); ctx.fill();
    drawMark(ctx, 6, 8, 36, 32); save("assets/favicon.png", c); }

  return out;
}, { markData, BRAND });

for (const [name, url] of Object.entries(files)) {
  writeFileSync(join(mobile, name), Buffer.from(url.split(",")[1], "base64"));
  console.log("wrote", name);
}
await browser.close();
