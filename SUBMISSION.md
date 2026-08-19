# Submission kit

Copy to paste, plus the checklist that stops an otherwise-good entry from being
disqualified on a technicality. Fill in the two placeholders and go.

```
APP_URL   = https://your-deployment-url
CAST_URL  = https://warpcast.com/~/conversations/0x…   (exists only after you cast)
```

---

## The brief's four hard requirements

These are pass/fail, independent of how good the app is.

| Requirement | Status |
| --- | --- |
| Display **real** POIDH bounty data | Reads `poidh.xyz/[chain]/bounty/[id]/data` live in the browser across Base, Degen and Arbitrum. **Run `node probe-schema.mjs` before casting** — see VERIFICATION.md §1. |
| Publicly accessible, **no local setup** | One static HTML file. Deploy to Pages/Netlify/IPFS. Nothing to install, no wallet prompt, no backend. |
| Shared in a **Farcaster cast** | You must do this. Copy below. |
| Live app link **and** cast link in the POIDH submission | You must do this. Both links, in the submission body. |

The last two are the ones people lose on. The cast link cannot be included until
after you cast, so the order is: deploy → cast → copy the cast URL → submit.

---

## Farcaster cast

Post the app URL as the embed so the `fc:miniapp` card renders. Lead option:

> Every POIDH bounty, printed as one contact sheet.
>
> Base, Degen and Arbitrum on a single roll. Bounties with accepted proof are
> developed and ringed. Bounties still waiting are unexposed film.
>
> One HTML file. No backend, no build step, no wallet. Filter it, sort it, and
> every view is a link you can cast.
>
> APP_URL

Shorter, if you prefer punchier:

> POIDH, as a contact sheet.
>
> Every bounty on Base, Degen and Arbitrum as one roll of film — proof developed,
> unclaimed bounties left unexposed.
>
> One HTML file. No backend. Works offline.
>
> APP_URL

Emphasising the unstoppable angle, which the judging explicitly rewards:

> I put every POIDH bounty on one contact sheet.
>
> Base + Degen + Arbitrum, proof images developed in place. It's a single HTML
> file with zero dependencies — pin it to IPFS and it cannot be taken down. Ships
> with an offline snapshot so it still shows real bounties if the API is down.
>
> APP_URL

**Before you cast:** check the embed in Warpcast's debug tool. `__APP_URL__` must
already be replaced or the card will show a broken image.

---

## POIDH submission text

> **POIDH Contact Sheet — every bounty, one roll**
>
> Live app: APP_URL
> Farcaster cast: CAST_URL
>
> A contact sheet is what a photographer prints to see a whole roll at once, and
> POIDH is a protocol about photographic proof — so the metaphor is the
> information architecture, not decoration. Every bounty is a frame. Frames whose
> proof was accepted get a cyan grease-pencil ring, the mark a photographer makes
> on a contact sheet to say "print this one"; frames still waiting are unexposed
> film with a latent title showing through. Status is encoded as
> darkroom-chemistry colour, so a thousand bounties are legible as a texture
> before you read a single word.
>
> **Quantity.** It crawls up to 1500 bounty ids per chain across Base, Degen and
> Arbitrum. Because the documented endpoint is per-bounty, the highest live id is
> found by an exponential ramp then a binary search — 18 requests to locate the
> top of a 137-bounty range in testing, rather than 137 — and the crawl then runs
> at bounded concurrency with retries and exponential backoff. Bounties that exist
> but cannot be read are counted and reported rather than quietly dropped, so a
> partial sheet is never presented as the complete set.
>
> **Discovery and understanding.** Filter by chain, status, minimum reward and
> whether proof exists; sort by reward, age or id; full-text search. Four
> leaderboards rank biggest rewards, most proof submitted, most bounties posted
> and most bounties won. Click any frame for a loupe view with the full
> description, every proof submission, and the raw API response. Rewards are
> summed with exact BigInt wei arithmetic and aggregated per currency, so ETH and
> DEGEN are never added together. Filters, sort and the open bounty all live in
> the URL hash — every view you can reach is a link you can cast.
>
> **Fewer dependencies.** One HTML file, 95KB. No framework, no build step, no
> CDN, no webfont, no analytics, no backend, no wallet connection. Three inline
> script blocks and nothing else. It opens from a local disk with no server.
>
> **Decentralized, resilient, unstoppable.** Being a single file means it pins to
> IPFS as-is, so it can be hosted at a content address no one can revoke. Data
> loading degrades in layers: IndexedDB cache, then an optional same-origin
> snapshot, then live API — each painting immediately and the next refreshing on
> top. If poidh.xyz is unreachable or CORS-blocked, a deployed snapshot still
> shows real bounties. If a proof image's IPFS gateway is dead, it fails over
> through four. A hand-rolled ABI encoder and `eth_call` client are included so
> bounties can be read straight from the chain — shipped disarmed, because
> guessing a contract address and presenting the result as real would be worse
> than shipping nothing.
>
> Every transaction links out to poidh.xyz. This app is read-only by design.
>
> **Verification.** 534 assertions across seven suites, run against the code
> extracted from the shipped file rather than a copy — including three suites that
> exist only to prove it degrades honestly: API dead with a snapshot, everything
> dead, and a flaky network. Testing found and fixed six real bugs, among them an
> SVG-data-URL XSS hole and a crawler that presented 88 of 90 bounties as the
> whole roll. `VERIFICATION.md` ships with it and lists what was measured and what
> was not, including that the visual appearance was never rendered in the build
> environment.

### If a short version is wanted

> **POIDH Contact Sheet** — APP_URL · cast: CAST_URL
>
> Every bounty on Base, Degen and Arbitrum as one photographic contact sheet.
> Proof images developed in place, unclaimed bounties left as unexposed film.
> Filter, sort, search, four leaderboards, and a loupe view with the raw payload
> for any frame. Rewards summed with exact wei arithmetic, per currency.>
> One HTML file, 95KB, no framework or backend or build step — so it pins to IPFS
> unchanged. Falls back through cache → offline snapshot → live API, and says
> which of those you are looking at. 534 assertions ship with it, plus an honest
> list of what is still unverified.

---

## Order of operations

1. `node probe-schema.mjs` — fix anything CRITICAL before going further
2. Open `index.html` in a browser and actually look at it
3. `node make-snapshot.mjs` — deploy `snapshot.json` next to `index.html`
4. Replace `__APP_URL__` with the real origin; verify zero remain
5. `bash tests/run-tests.sh` → 534 pass, 0 fail
6. Deploy; open the live URL and confirm bounties appear
7. Check the embed in Warpcast's debug tool
8. Cast, using the copy above
9. Copy the cast URL
10. Submit to POIDH with **both** links

Steps 1, 2 and 6 are the difference between an entry that works and one that
looks like it should.
