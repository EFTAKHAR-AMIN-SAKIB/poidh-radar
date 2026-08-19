import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "lib", "poidh", "snapshot.json");

const CHAINS = [
  { slug: "base", max: 1325, sampleCount: 150 },
  { slug: "degen", max: 1400, sampleCount: 150 },
  { slug: "arbitrum", max: 250, sampleCount: 80 },
  { slug: "mainnet", max: 20, sampleCount: 20 },
];

async function fetchBounty(chain, id) {
  const url = `https://poidh.xyz/${chain}/bounty/${id}/data`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) return null;
  const text = await res.text();
  if (!text || !text.trim().startsWith("{")) return null;
  const json = JSON.parse(text);
  if (!json || Object.keys(json).length === 0) return null;
  return json;
}

async function main() {
  console.log("Fetching live snapshot from POIDH API across all chains...");
  const allBounties = [];

  for (const c of CHAINS) {
    console.log(`\nFetching ${c.slug} (sampling up to ${c.sampleCount} latest IDs)...`);
    const ids = [];
    // Prioritize newest IDs
    for (let id = c.max; id >= Math.max(1, c.max - c.sampleCount); id--) {
      ids.push(id);
    }
    // Also include landmark early IDs
    for (let id = 1; id <= 10; id++) {
      if (!ids.includes(id)) ids.push(id);
    }

    let ok = 0;
    const batchSize = 10;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (id) => {
          try {
            const raw = await fetchBounty(c.slug, id);
            if (raw) return { chain: c.slug, id, raw };
          } catch (e) {}
          return null;
        })
      );

      for (const r of results) {
        if (r) {
          allBounties.push(r);
          ok++;
        }
      }
      process.stdout.write(`\r  ${c.slug}: ${ok} bounties loaded`);
    }
    console.log(`\n  Done: ${ok} valid bounties on ${c.slug}`);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    total: allBounties.length,
    bounties: allBounties,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`\nSnapshot successfully written to ${OUT} (${allBounties.length} bounties, ${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
