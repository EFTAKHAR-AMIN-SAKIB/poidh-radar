#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = path.join(HERE, "..", "lib", "poidh", "snapshot.json");

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const SCAN_RANGES = {
  base: { top: 1352, window: 60 },
  degen: { top: 1400, window: 60 },
  arbitrum: { top: 332, window: 60 },
  mainnet: { top: 30, window: 30 },
};

async function fetchBounty(chain, id, timeoutMs = 8000) {
  const url = `https://poidh.xyz/${chain}/bounty/${id}/data`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "application/json, text/plain, */*",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 404) return null;
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        continue;
      }

      const text = await res.text();
      if (!text || !text.trim().startsWith("{")) continue;
      const json = JSON.parse(text);
      if (json && (json.title || json.name || json.id || json.amount)) {
        return json;
      }
      return null;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  return null;
}

async function pool(items, fn, concurrency = 10) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      const item = items[i];
      const res = await fn(item);
      results[i] = res;
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log("=== POIDH High-Precision Live Snapshot Refresh ===");
  console.log(`Target: ${SNAPSHOT_PATH}`);

  const targetMap = new Map();

  if (fs.existsSync(SNAPSHOT_PATH)) {
    try {
      const prev = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
      if (prev && Array.isArray(prev.bounties)) {
        for (const b of prev.bounties) {
          if (b && b.chain && b.id) {
            targetMap.set(`${b.chain}:${b.id}`, { chain: b.chain, id: b.id, rawFallback: b.raw });
          }
        }
      }
    } catch (e) {
      console.warn("Notice: could not read existing snapshot:", e.message);
    }
  }

  console.log(`Loaded ${targetMap.size} existing bounty keys.`);

  for (const [chain, { top, window }] of Object.entries(SCAN_RANGES)) {
    for (let id = Math.max(1, top - window); id <= top; id++) {
      const key = `${chain}:${id}`;
      if (!targetMap.has(key)) {
        targetMap.set(key, { chain, id, rawFallback: null });
      }
    }
  }

  const allTargets = Array.from(targetMap.values());
  console.log(`Total bounties queued to probe/refresh: ${allTargets.length}`);

  let completed = 0;
  let liveSuccess = 0;
  let fallbackUsed = 0;
  let missed = 0;
  const t0 = Date.now();

  const results = await pool(
    allTargets,
    async ({ chain, id, rawFallback }) => {
      const live = await fetchBounty(chain, id);
      completed++;

      if (completed % 50 === 0 || completed === allTargets.length) {
        process.stdout.write(
          `\rProgress: ${completed}/${allTargets.length} (${((completed / allTargets.length) * 100).toFixed(0)}%) | Live: ${liveSuccess} | Fallback: ${fallbackUsed}   `
        );
      }

      if (live) {
        liveSuccess++;
        return { chain, id, raw: live, fetchedAt: Date.now() };
      }

      if (rawFallback) {
        fallbackUsed++;
        return { chain, id, raw: rawFallback, fetchedAt: Date.now() };
      }

      missed++;
      return null;
    },
    10
  );

  const validBounties = results.filter(Boolean);

  validBounties.sort((a, b) => {
    if (a.chain !== b.chain) return a.chain.localeCompare(b.chain);
    return b.id - a.id;
  });

  const counts = { base: 0, degen: 0, arbitrum: 0, mainnet: 0 };
  const maxDiscovered = { base: 0, degen: 0, arbitrum: 0, mainnet: 0 };

  for (const b of validBounties) {
    counts[b.chain] = (counts[b.chain] || 0) + 1;
    if (b.id > (maxDiscovered[b.chain] || 0)) {
      maxDiscovered[b.chain] = b.id;
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "https://poidh.xyz/[chain]/bounty/[id]/data",
    total: validBounties.length,
    counts,
    maxDiscovered,
    bounties: validBounties,
  };

  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(payload, null, 2));

  const durationSec = ((Date.now() - t0) / 1000).toFixed(1);
  const sizeKb = (fs.statSync(SNAPSHOT_PATH).size / 1024).toFixed(1);

  console.log(`\n\n========================================`);
  console.log(`REFRESH COMPLETE in ${durationSec}s`);
  console.log(`Total Bounties Saved: ${validBounties.length} (${sizeKb} KB)`);
  console.log(`Live Fresh: ${liveSuccess}, Preserved Fallback: ${fallbackUsed}`);
  console.log(`Per-Chain Counts:`, counts);
  console.log(`Max Discovered IDs:`, maxDiscovered);
  console.log(`========================================\n`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
