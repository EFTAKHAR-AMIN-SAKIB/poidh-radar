# Radar Score audit

An audit of `lib/scoring/radarScore.ts` as it exists today, measured rather than
read. Every number below came from executing the shipped function — over a
115,520-combination sweep of the input space, and over the 90 real bounties in
`lib/poidh/snapshot.json` (generated 2026-08-19, chains: base 65, arbitrum 16,
mainnet 5, degen 4).

Reproduce with `node scripts/audit-radar-score.cjs` and
`node scripts/audit-radar-variance.cjs`.

**Verdict in one line:** the five dimensions are the right five, but the
calibration is broken badly enough that the score cannot order its own dataset —
92% of bounties are tied with at least one other, and more competition sometimes
scores *higher* than less. Fix the calibration before adding any Radar 2.0
dimension.

---

## 1. The score cannot separate the bounties it is ranking

| Measurement | Result |
| --- | --- |
| Distinct scores across 90 real bounties | **18** |
| Bounties sharing a score with ≥1 other | **83 / 90 (92%)** |
| Largest single tie | **33 bounties (37%) all score exactly 55** |
| Observed range on real data | 42–79 |
| Standard deviation | 8.33 |

Ties are resolved by `Array.prototype.sort` stability, which means **snapshot
array position** — not by any signal. That is the whole ballgame for a discovery
product: for 92% of the catalogue, "ranked by Radar Score" is "ranked by
whatever order the API returned".

It already changes what users see. Measured at each shelf size:

| Shelf | Cut score | Bounties holding that score | Excluded by array position alone |
| --- | --- | --- | --- |
| top-3 | 74 | 1 | 0 |
| top-5 | 72 | 4 | **3** |
| top-8 (`HotBounties`) | 72 | 4 | 0 — clean today, by luck |
| top-12 | 71 | 5 | **1** |
| top-20 | 67 | 4 | **2** |

`HotBounties` cuts cleanly at 8 right now. Five bounties sit tied at 71 directly
below it, so one new bounty makes that shelf arbitrary too.

**Cause:** every dimension is a step function. Freshness has 7 possible values,
ETH reward 8, status 4, opportunity 4, activity ~5. The score is a sum of coarse
buckets, so collisions are the expected outcome, not bad luck.

**Fix:** make freshness and reward continuous — an exponential decay for age
(`25 * 0.5 ** (ageDays / halfLife)`) and a straight log curve for reward — and
keep one decimal internally, rounding only for display. Same philosophy, same
budgets, roughly 90 distinct values instead of 18.

---

## 2. "Opportunity" and "Activity" cancel each other out, and invert

They are allocated 15 + 10 = **25 of the 100 points** and both measure
competition — in opposite directions. Measured across the entire claim spectrum,
holding everything else fixed (open, 1 day old, 0.1 ETH):

| claims | opportunity | activity | sum | total |
| --- | --- | --- | --- | --- |
| 0 | 15 | 0 | 15 | 85 |
| 1 | 12 | 3 | 15 | 85 |
| 2 | 9 | 5 | **14** | 84 |
| 3 | 9 | 6 | **15** | **85** |
| 4 | 4 | 7 | 11 | 81 |
| 5 | 4 | 8 | 12 | 82 |
| 7 | 4 | 9 | 13 | 83 |
| 10+ | 4 | 10 | 14 | 84 |

Two findings, both concrete:

**The combined spread is 11–15.** Four points of movement out of the 25
allocated. A quarter of the score budget produces 4% of the discrimination.

**It is non-monotonic.** Going from 2 claims to 3 claims *gains* a point.
4 → 5 gains one. 7 → 10 gains one. So a bounty with 3 competitors outranks the
identical bounty with 2:

```
78  0.02 ETH, 1d old, 2 claims
79  0.02 ETH, 1d old, 3 claims     <- more competition, higher score
```

That directly contradicts the dimension's stated purpose ("Opportunity /
Competition — measures probability of winning"). A judge who pokes at the score
will find this in about four clicks, and the score is the app's main
intellectual claim.

**Fix:** delete one of them. Keep a single monotonic competition term worth ~20
points — `20 / (1 + claims)` or a decaying curve — and if proof momentum is
worth showing, show it as a badge, not as points that fight the ranking.

---

## 3. Three of the five dimensions barely move; one is a literal constant

Variance decomposition over the 90 real bounties. "Share of movement" is each
dimension's standard deviation as a fraction of the total.

| Dimension | Budget | Observed range | SD | Share of actual movement |
| --- | --- | --- | --- | --- |
| Freshness | 25 | 3–25 | 5.64 | **43.5%** |
| Reward magnitude | 30 | 4–28 | 4.34 | **33.4%** |
| Status | 20 | 20–20 | 0.00 | **0.0% — constant** |
| Opportunity | 15 | 12–15 | 1.50 | 11.6% |
| Activity | 10 | 0–3 | 1.50 | 11.6% |

The pie chart in the write-up (30/25/20/15/10) describes the *budget*. Measured
behaviour is 77% freshness-and-reward.

Status contributes exactly nothing, and this is structural rather than a quirk of
the snapshot: `getAllBounties()` reads `/api/bounties`, which serves active
bounties, and the snapshot is 90/90 open. **The app only ever indexes open
bounties, so a 20-point dimension whose whole job is to prefer open bounties is
dead weight in production.** Either index completed bounties too — they are
genuinely useful for a showcase, since they are the ones with proof images — or
reclaim those 20 points.

Correlation check, same 90 bounties:

```
Spearman(score, -age)    = 0.750      1.0 would mean "identical to newest-first"
Spearman(score, reward)  = 0.567
Spearman(score, -claims) = -0.088     competition has almost no bearing
top-10 by score vs top-10 by newest-first: 7 of 10 are the same bounties
```

A five-dimension score that reproduces 7 of the top 10 from a plain recency sort
is doing less work than its presentation implies.

---

## 4. DEGEN is systematically over-rewarded at equal dollar value

Using the app's own fallback prices from `formatReward` — ETH $2,800,
DEGEN $0.008:

| Same USD value | ETH points | DEGEN points | Gap |
| --- | --- | --- | --- |
| $5 | 10 | 15 | DEGEN +5 |
| $10 | 10 | 17 | DEGEN +7 |
| $20 | 14 | 19 | DEGEN +5 |
| $40 | 14 | 21 | DEGEN +7 |
| $100 | 19 | 24 | DEGEN +5 |
| $500 | 25 | 28 | DEGEN +3 |
| $1,000 | 25 | 30 | DEGEN +5 |
| $2,800 | 30 | 30 | equal |

Clean inversion: **$40 in DEGEN scores 21; $100 in ETH scores 19.** Two and a
half times the money, two fewer points. Since Degen Chain is 4 of 90 bounties
today the damage is small, but the mechanism is wrong and it is the one thing a
Degen-native judge would check.

Proposal #3 on the Radar 2.0 list — USD parity normalisation — is therefore the
one that matters most. One caveat specific to this bounty: the judging favours
**fewer external dependencies**, so do not add a live price oracle. Use a
hard-coded, dated price table with an override, and print the date next to the
number. A stale-but-labelled constant is more defensible here than a network
call that can fail.

---

## 5. The documentation describes a function that does not exist

The docstring says reward magnitude is *"log-scaled reward normalized against
chain median."* There is no median anywhere in the file — the ETH path is eight
hard-coded thresholds. The DEGEN anchor points in the comments are wrong at
every single point:

| Amount | Comment / write-up says | Actual | |
| --- | --- | --- | --- |
| 100 DEGEN | 6 | **10** | mismatch |
| 1,000 DEGEN | 14 | **17** | mismatch |
| 5,000 DEGEN | 20 | **21** | mismatch |
| 20,000 DEGEN | 26 | **25** | mismatch |
| 50,000 DEGEN | 30 | **28** | mismatch |

30 points is unreachable in DEGEN until roughly **119,000 DEGEN**, not 50,000.

This matters beyond tidiness: the Radar 2.0 write-up repeated these figures as
fact, which is how an inaccurate methodology claim ends up in a bounty
submission. Either regenerate the anchors from the code or delete the anchors.

---

## 6. The score is presented as /100 but tops out at 90

Brute-forcing 115,520 input combinations:

```
lowest reachable  : 12   (cancelled, 200d old, 0 claims)
highest reachable : 90   (open, brand new, 0 claims, ≥1 ETH)
distinct values   : 79
```

The clamp is `Math.max(1, Math.min(99, …))`, so 100 is unreachable by
construction — but the real ceiling is 90, because opportunity and activity
cannot both be maximal (opportunity 15 requires 0 claims; activity requires
claims > 0). The bounty detail page renders `{radarScore} / 100` and a progress
bar at `width: {radarScore}%`, so a perfect bounty shows a bar that is visibly
90% full. Fixing §2 fixes this as a side effect.

Also: `opportunity` defaults to **5 free points** for `paid`, `cancelled` and
`unknown` — a cancelled bounty carries five points of "probability of winning".

---

## 7. Enrichment silently desynchronises the score from the data

`getAllBounties()` in `lib/poidh/client.ts` mutates `claimCount` after scoring:

```js
if (typeof dJson.submissions === "number") {
  b.claimCount = dJson.submissions;      // score is NOT recomputed
}
```

Reproduced:

```
before enrichment: claimCount=0  score=79  opportunity=15/15  activity=0/10
                   tags: ["💎 Hidden Gem","🆕 Fresh Drop","⚡ Low Competition"]
after  enrichment: claimCount=7  score=79  opportunity=15/15  activity=0/10
                   tags: ["💎 Hidden Gem","🆕 Fresh Drop","⚡ Low Competition"]
```

`ScoreBreakdownModal` will state *"competition level 15/15"* and show a
**Hidden Gem / Low Competition** badge next to a visible count of 7 submissions.
The sort on the next line then orders by the stale score. This affects the first
30 bounties — precisely the ones on the front page.

**Fix:** re-run `calculateRadarScore` after enrichment, or enrich before
normalising.

---

## 8. Tags that fire on everything, or say the wrong thing

Measured tag frequency across the 90 bounties:

```
⚡ Low Competition   90   (100% — fires on every single bounty)
👥 Multiplayer       72
💎 Hidden Gem        24
🆕 Fresh Drop         7
💰 High Reward        5
🔥 High Momentum      0
```

A badge on 100% of items carries zero information and costs a slot in
`slice(0, 3)`. Separately:

```
fresh, 0 claims, 0.5 ETH -> score 88, tags ["💎 Hidden Gem","🔥 High Momentum","💰 High Reward"]
  breakdown activity = 0/10
```

**"High Momentum" fires on a bounty with zero activity**, because the trigger is
`total >= 80` rather than anything to do with velocity. Rename it to match its
trigger (`⭐ Top Rated`) or gate it on activity. Also `⚡` is used for both "Low
Competition" and "High Engagement", which are opposites.

Proposal #2 on the Radar 2.0 list — bonus points for multiplayer — would repeat
the §3 mistake: 76 of 90 bounties are already flagged multiplayer, so points for
it are near-constant and add nothing to the ordering. Keep it as a filter, not a
score term.

---

## 9. The test suite currently fails, and could not catch any of the above

`tests/test-radar.ts`, run now:

```
[TEST 1] Loaded 90 bounties from snapshot.
Test failed: AssertionError: Should have loaded at least 100 bounties from snapshot
```

Beyond being red, the suite is structurally unable to fail for the right reasons:

- `assert(b.radarScore >= 0 && b.radarScore <= 100)` is tautological — the
  function clamps to `[1, 99]`, so this can never fail.
- Every component assertion is `<= budget`, also guaranteed by construction.
- `console.log("✓ All 422 bounties evaluated…")` is a hardcoded string. The
  actual count is 90.
- It ends with `ALL 5 TEST SUITES PASSED PERFECTLY (100%)` — hardcoded, and
  claims more than was checked.

What would actually earn confidence: monotonicity (score must never increase
when claims increase, all else equal), tie rate below a threshold on the real
snapshot, attainable range matching what the UI advertises, USD-parity across
chains within a tolerance, and score/breakdown consistency after enrichment.
Those five properties are exactly the five defects above, which is the point.

---

## Recommended order of work

Numbered by dependency, not ambition. Items 1–3 are roughly one afternoon in one
file and they are what turn the score from a label into a ranking.

1. **Make freshness and reward continuous.** Kills the 92% tie rate. One
   function, no schema change, no new dependency.
2. **Collapse opportunity + activity into one monotonic competition term.** Fixes
   the inversion and the 90-point ceiling; frees ~10 points of budget.
3. **Normalise reward to USD** with a pinned, dated, overridable price table —
   not a live oracle, because the judging penalises dependencies.
4. **Recompute the score after enrichment** in `client.ts`.
5. **Decide what status is for:** either index completed bounties so the
   dimension does work, or reclaim its 20 points.
6. **Make the comments and the write-up match the code**, and fix the tag labels
   and the 100%-frequency badge.
7. **Replace the test suite's bounds checks with the five property tests above**,
   and delete the hardcoded "422" and "PASSED PERFECTLY" strings.
8. *Then* consider new signals. Of the proposed Radar 2.0 list, content-quality
   scoring and archetype matching add real discrimination and are worth doing —
   after the budget has been rebalanced, not bolted onto a 100-point scale that
   already cannot reach 100. Opportunity tiers (S/A/B/C) and the visual
   breakdown chart are presentation over the same ordering; they inherit
   whatever is wrong underneath, and "top 5%" is not well defined over a
   distribution with 18 distinct values.

## What this audit did not check

The score's *inputs* — whether `createdAt`, `amount`, `submissions` and the
status flags are being read from the right fields of the live API — were not
verified here. 0 of 90 snapshot rows had a missing `createdAt`, which is
encouraging, but the snapshot was produced by the same field-mapping code being
audited, so it cannot corroborate itself. Note also that a missing `createdAt`
silently pins freshness to 8/25 with no indication in the UI that the number is a
default rather than a measurement.

Separately, `weiToNumber` mis-handles three plausible encodings, which would
distort reward points and the displayed amount:

```
"1e18"                  -> 1000          (off by 1e15; still scores 30/30)
"0x16345785d8a0000"     -> 0             (real 0.1 ETH bounty scores 5/30)
"1500000000000000000.0" -> 1.5e18        (displays as "1500000000000M ETH")
```

Whether the API can emit any of these is unknown. Guarding the parser is cheaper
than finding out in front of judges.
