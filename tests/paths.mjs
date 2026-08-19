/* Where index.html lives, resolved rather than hardcoded.
 *
 * The suites are shipped next to the app so anyone can re-run the evidence, and
 * they get run from a couple of different places (the repo root, this tests/
 * directory, a checkout on someone else's machine). Guessing a single relative
 * path would break in all but one of them, so the file is searched for and the
 * result is reported explicitly — a suite that silently tested the wrong file
 * would be worse than one that fails to start.
 *
 * Override with POIDH_HTML=/path/to/index.html.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const candidates = process.env.POIDH_HTML
  ? [process.env.POIDH_HTML]
  : [
      path.join(HERE, "index.html"),           // suites sitting beside the app
      path.join(HERE, "..", "index.html"),     // suites in tests/
      path.join(process.cwd(), "index.html")   // run from the app's directory
    ];

const found = candidates.find(p => { try { return fs.statSync(p).isFile(); } catch { return false; } });

if (!found) {
  console.error("Could not find index.html. Looked in:");
  candidates.forEach(p => console.error("  " + p));
  console.error("Set POIDH_HTML=/path/to/index.html to point at it directly.");
  process.exit(2);
}

export const HTML_PATH = path.resolve(found);
export const HTML = fs.readFileSync(HTML_PATH, "utf8");

/* Sanity check: the suites assume the three-block structure, so fail loudly
   rather than reporting a pile of confusing assertion errors. */
export const SCRIPTS = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (SCRIPTS.length !== 3) {
  console.error("Expected exactly 3 inline <script> blocks in " + HTML_PATH
                + ", found " + SCRIPTS.length + ". The suites assume that layout.");
  process.exit(2);
}
