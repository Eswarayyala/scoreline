/**
 * Sequential Pollinations download controller for game_assets_manifest_270.json
 *
 * Requires a free API key from https://enter.pollinations.ai
 *   set POLLINATIONS_API_KEY=sk_...
 *
 * Usage:
 *   node download_all_assets.js
 *   node download_all_assets.js --limit 9
 *   node download_all_assets.js --dry-run
 */

import { createWriteStream, existsSync, readFileSync } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const ASSETS_ROOT = join(ROOT, "src", "assets", "games");
const DEFAULT_MANIFEST = resolve(
  process.env.USERPROFILE || process.env.HOME || ROOT,
  "Downloads",
  "game_assets_manifest_270.json",
);

const KIND_FOLDERS = {
  avatar: "avatars",
  event_background: "backgrounds",
  flyer_poster: "posters",
};

const DELAY_MS = Number(process.env.ASSET_DELAY_MS || 3500);
const BACKOFF_402_MS = Number(process.env.ASSET_BACKOFF_402_MS || 30_000);
const MAX_CONSECUTIVE_402 = Number(process.env.ASSET_MAX_402 || 5);
const REQUEST_TIMEOUT_MS = Number(process.env.ASSET_TIMEOUT_MS || 180_000);
const POLLINATIONS_BASE = "https://gen.pollinations.ai/image";

function loadDotEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq < 1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  });
}

loadDotEnv();

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    limit: 0,
    manifest: DEFAULT_MANIFEST,
    skipExisting: true,
    kinds: null,
    wipe: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--force") opts.skipExisting = false;
    else if (arg === "--wipe") opts.wipe = true;
    else if (arg === "--limit") opts.limit = Number(argv[++i]) || 0;
    else if (arg === "--kinds") {
      const raw = String(argv[++i] || "");
      opts.kinds = new Set(
        raw
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean)
          .map((item) => (item === "avatar" ? "avatars" : item === "background" ? "backgrounds" : item === "poster" ? "posters" : item)),
      );
    } else if (!arg.startsWith("-")) opts.manifest = resolve(arg);
  }
  return opts;
}

const VARIATION_CUES = {
  avatars: [
    "unique face angle three-quarter view, cyan rim light",
    "unique face angle profile silhouette, magenta accent glow",
    "unique face angle front hero shot, gold specular highlights",
  ],
  backgrounds: [
    "wide empty midground for UI overlay, cool blue fog, no characters",
    "asymmetric neon architecture, warm orange haze, no characters",
    "deep perspective corridor, violet particles, no characters",
  ],
  posters: [
    "diagonal action crop, upper copy band empty",
    "centered arena frame, lower third empty for title",
    "split-panel composition, center negative space",
  ],
};

function slugGame(name) {
  return String(name || "game")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "game";
}

function parseResolution(resolution = "1080x1080") {
  const match = String(resolution).match(/(\d+)\s*[x×]\s*(\d+)/i);
  if (!match) return { width: 1080, height: 1080 };
  return { width: Number(match[1]), height: Number(match[2]) };
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureGameFolders(gameName) {
  const gameDir = join(ASSETS_ROOT, slugGame(gameName));
  const folders = ["avatars", "backgrounds", "posters"];
  const created = [];
  for (const folder of folders) {
    const dir = join(gameDir, folder);
    if (!(await pathExists(dir))) {
      await mkdir(dir, { recursive: true });
      created.push(dir);
    }
  }
  return { gameDir, created };
}

function apiKey() {
  return String(process.env.POLLINATIONS_API_KEY || process.env.POLLINATIONS_KEY || "").trim();
}

function diversifyPrompt(entry, folder, index) {
  const cue = (VARIATION_CUES[folder] || [])[index % 3] || `variation seed ${index + 1}`;
  return `${String(entry.prompt || "").trim()}. Distinct composition: ${cue}. Avoid repeating prior frames.`;
}

function buildPollinationsUrl(entry, folder, index) {
  const { width, height } = parseResolution(entry.resolution);
  const prompt = diversifyPrompt(entry, folder, index);
  const encoded = encodeURIComponent(prompt);
  const seed = Math.abs(
    [...`${entry.id || prompt}-${index}`].reduce((acc, ch) => ((acc * 33) ^ ch.charCodeAt(0)) | 0, 7),
  );
  const params = new URLSearchParams({
    model: process.env.ASSET_MODEL || "flux",
    width: String(width),
    height: String(height),
    nologo: "true",
    enhance: "false",
    seed: String(seed),
  });
  const key = apiKey();
  if (key) params.set("key", key);
  return `${POLLINATIONS_BASE}/${encoded}?${params.toString()}`;
}

function flattenJobs(manifest, kindFilter = null) {
  const jobs = [];
  for (const [gameName, kinds] of Object.entries(manifest || {})) {
    for (const [kindKey, folder] of Object.entries(KIND_FOLDERS)) {
      if (kindFilter && !kindFilter.has(folder)) continue;
      const entries = Array.isArray(kinds?.[kindKey]) ? kinds[kindKey] : [];
      entries.forEach((entry, index) => {
        const id = entry.id || `${slugGame(gameName)}-${folder}-${index + 1}`;
        const fileName = `${id}.jpg`;
        const relPath = join("src", "assets", "games", slugGame(gameName), folder, fileName);
        const absPath = join(ASSETS_ROOT, slugGame(gameName), folder, fileName);
        jobs.push({
          gameName,
          kindKey,
          folder,
          id,
          prompt: entry.prompt,
          resolution: entry.resolution,
          aspect_ratio: entry.aspect_ratio,
          relPath,
          absPath,
          url: buildPollinationsUrl(entry, folder, index),
        });
      });
    }
  }
  return jobs;
}

async function downloadOne(job, { dryRun }) {
  if (dryRun) {
    return { status: "dry-run", path: job.relPath, url: job.url };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers = { Accept: "image/*" };
    const key = apiKey();
    if (key) headers.Authorization = `Bearer ${key}`;

    const response = await fetch(job.url, { signal: controller.signal, headers });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const err = new Error(`HTTP ${response.status} ${response.statusText}${body ? ` · ${body.slice(0, 180)}` : ""}`);
      err.status = response.status;
      throw err;
    }
    if (!response.body) throw new Error("Empty response body");
    await mkdir(dirname(job.absPath), { recursive: true });
    await pipeline(response.body, createWriteStream(job.absPath));
    return { status: "saved", path: job.relPath };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const opts = parseArgs(process.argv);
  const key = apiKey();

  console.log(`[controller] manifest: ${opts.manifest}`);
  console.log(`[controller] output:   ${ASSETS_ROOT}`);
  console.log(`[controller] endpoint: ${POLLINATIONS_BASE}`);
  console.log(`[controller] delay:    ${DELAY_MS}ms between requests`);
  console.log(`[controller] api key:  ${key ? `${key.slice(0, 6)}…` : "MISSING"}`);

  if (!key && !opts.dryRun) {
    console.error(`
[fatal] Pollinations no longer allows anonymous image downloads (HTTP 402).
Create a free key at https://enter.pollinations.ai then either:

  set POLLINATIONS_API_KEY=sk_your_key_here
  node download_all_assets.js

or add to .env:
  POLLINATIONS_API_KEY=sk_your_key_here
`);
    process.exitCode = 1;
    return;
  }

  const raw = await readFile(opts.manifest, "utf8");
  const manifest = JSON.parse(raw);
  const games = Object.keys(manifest);
  console.log(`[controller] games:    ${games.length}`);

  for (const gameName of games) {
    const { created } = await ensureGameFolders(gameName);
    if (created.length) {
      console.log(`[mkdir] ${slugGame(gameName)}`);
    }
  }

  let jobs = flattenJobs(manifest, opts.kinds);
  if (opts.wipe && !opts.dryRun) {
    const { unlink } = await import("node:fs/promises");
    let wiped = 0;
    for (const job of jobs) {
      if (await pathExists(job.absPath)) {
        await unlink(job.absPath);
        wiped += 1;
      }
    }
    console.log(`[wipe] removed ${wiped} existing files for selected kinds`);
    opts.skipExisting = false;
  }
  if (opts.limit > 0) jobs = jobs.slice(0, opts.limit);
  console.log(`[controller] jobs:     ${jobs.length}${opts.dryRun ? " (dry-run)" : ""}${opts.kinds ? ` · kinds=${[...opts.kinds].join(",")}` : ""}`);

  const placementLog = [];
  let saved = 0;
  let skipped = 0;
  let failed = 0;
  let consecutive402 = 0;

  for (let i = 0; i < jobs.length; i += 1) {
    const job = jobs[i];
    const label = `[${i + 1}/${jobs.length}] ${job.gameName} · ${job.folder} · ${job.id}`;

    if (opts.skipExisting && (await pathExists(job.absPath))) {
      skipped += 1;
      console.log(`${label} → skip (exists)`);
      placementLog.push({ game: job.gameName, kind: job.folder, id: job.id, path: job.relPath, status: "skipped-exists" });
      continue;
    }

    try {
      console.log(`${label} → fetch`);
      const result = await downloadOne(job, opts);
      consecutive402 = 0;
      placementLog.push({
        game: job.gameName,
        kind: job.folder,
        id: job.id,
        path: job.relPath,
        resolution: job.resolution,
        status: result.status,
      });
      if (result.status === "saved") {
        saved += 1;
        console.log(`${label} → placed ${job.relPath}`);
      } else {
        console.log(`${label} → ${result.status}`);
      }
    } catch (error) {
      failed += 1;
      const status = error.status || 0;
      const message = error?.name === "AbortError" ? "timeout" : error.message || String(error);
      console.error(`${label} → FAIL ${message}`);
      placementLog.push({
        game: job.gameName,
        kind: job.folder,
        id: job.id,
        path: job.relPath,
        status: "failed",
        error: message,
      });

      if (status === 402) {
        consecutive402 += 1;
        console.log(`[backoff] 402 · waiting ${BACKOFF_402_MS}ms (${consecutive402}/${MAX_CONSECUTIVE_402})`);
        await sleep(BACKOFF_402_MS);
        if (consecutive402 >= MAX_CONSECUTIVE_402) {
          console.error(`[stop] ${MAX_CONSECUTIVE_402} consecutive 402s — check pollen balance at https://enter.pollinations.ai`);
          break;
        }
      } else {
        consecutive402 = 0;
      }
    }

    if (i < jobs.length - 1 && !opts.dryRun) {
      await sleep(DELAY_MS);
    }
  }

  const logPath = join(ASSETS_ROOT, "placement-log.json");
  await mkdir(dirname(logPath), { recursive: true });
  await writeFile(
    logPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        manifest: opts.manifest,
        totals: { jobs: jobs.length, saved, skipped, failed },
        placements: placementLog,
      },
      null,
      2,
    ),
  );

  console.log(`[done] saved=${saved} skipped=${skipped} failed=${failed}`);
  console.log(`[done] placement log → ${logPath}`);
}

main().catch((error) => {
  console.error("[fatal]", error);
  process.exitCode = 1;
});
