<div align="center">

# 📡 POIDH Radar
### *Onchain Bounty Discovery Engine & Intelligence Layer*

An editorial discovery platform and algorithmic scoring engine for live onchain bounties across **Base**, **Degen Chain**, **Arbitrum One**, and **Ethereum Mainnet**.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Networks](https://img.shields.io/badge/Networks-Base%20|%20Degen%20|%20Arbitrum%20|%20Ethereum-orange?style=flat-square)](https://poidh.xyz)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

[**Live Demo**](http://localhost:3000) • [**Explore Bounties**](http://localhost:3000/bounties) • [**Ecosystem Networks**](http://localhost:3000/chains) • [**Official POIDH**](https://poidh.xyz)

</div>

---

## 📖 Overview

**POIDH ("Pics Or It Didn't Happen")** is the open, decentralized protocol for onchain bounties — where anyone can post a challenge backed with crypto rewards, and participants submit cryptographic proof to claim the payout.

**POIDH Radar** is an independent discovery engine built on top of the POIDH protocol. It aggregates thousands of live bounties across multiple blockchains, normalizes multi-token economics, and provides a proprietary **Radar Score (0–100)** to help builders, hackers, and creators instantly find bounties worth solving.

---

## ✨ Key Features

### 1. 🎯 Algorithmic Radar Score (0–100) — *v2 Engine*
A continuous, USD-normalized multi-dimensional scoring algorithm that evaluates and ranks bounties with strict mathematical monotonicity and high discrimination:
- **Freshness (0–30 pts):** Smooth continuous exponential decay (21-day half-life) prioritizing new opportunities without cliff drops.
- **Reward Magnitude (0–35 pts):** Continuous log-scaled reward normalized to USD parity across ETH ($2,800) and DEGEN ($0.008).
- **Competition (0–20 pts):** Strictly monotonic inverse curve (`20 / (1 + 0.5 * claims)`) rewarding low-competition bounties (*"Zero Competition"* and *"Hidden Gems"*).
- **Content Quality (0–15 pts):** Continuous logarithmic specification richness based on title length, detailed description, and multiplayer collaboration flags.
- **Status Multiplier:** Multiplicative attenuation factor (`open = 1.0x`, `review = 0.75x`, `paid = 0.30x`, `cancelled = 0.05x`) prioritizing actionable bounties.

### 2. 🌐 Multi-Chain Aggregation
Indexes bounties continuously across all major POIDH-supported networks:
- **🔵 Base:** Coinbase's high-throughput L2 rollup and the primary hub for POIDH bounties.
- **🎩 Degen Chain:** Farcaster-native Layer 3 network with viral social bounties.
- **💙 Arbitrum One:** Flagship Ethereum L2 scaling solution.
- **⟠ Ethereum Mainnet:** The decentralized settlement layer for high-value coordinate actions.

### 3. 🌌 Interactive "Bounty Universe" (Orbital Constellation)
An interactive high-DPI 2D orbital canvas mapping active onchain bounties in a dynamic multi-chain galaxy:
- **Central Network Hubs:** Embedded official vector & badge logos for **Base**, **Degen**, **Arbitrum**, and **Ethereum Mainnet** with active ambient auras.
- **Chain-Matched Dot Colors:** Orbiting bounty nodes are color-coded to their parent network (Base Blue, Degen Purple, Arbitrum Cyan, Ethereum Slate).
- **High Radar Score Highlighting:** Bounties with Radar Score 80+ pulse with luminous halos and radiant spark cores.
- **Interactive Laser Target Rays:** Hovering any bounty projects a dashed laser beam back to its home network cluster.
- **Live Tooltip Previews:** Instant hover cards with rewards, claim counts, status, and direct navigation.

### 4. 🔍 Deep Explorer & Filter Rail
- Instant full-text search across titles, descriptions, issuer addresses, and tags.
- Multi-network and multi-status checkboxes.
- Quick filters for *"Hidden Gems"* (high reward + zero claims), *"Multiplayer"* (collaborative pools), and *"With Proof Only"*.
- Sorting by Radar Score, Reward, Newest, Oldest, or Claim Count.
- Global keyboard shortcut: Press <kbd>/</kbd> anywhere to focus search.

### 5. 🎲 "Surprise Me" Opportunity Picker
A randomized discovery modal designed to break filter bubbles and surface high-potential onchain challenges with a single click.

### 6. 🖼️ Proof Submissions & Media Gallery
Inspect community proof submissions with rich media previews, claimant addresses, social links (Farcaster / X), submission timestamps, and full-resolution lightbox view.

### 7. 📊 Network Ecosystem Intelligence
Dedicated `/chains` analytics dashboard showing bounty counts, total rewards pool volume in ETH and DEGEN, completion rates, and top bounties by network.

### 8. 🎨 Editorial Paper Design System
Crafted with a warm, publication-grade aesthetic inspired by editorial typography and film photography:
- Warm paper backgrounds (`#FAF9F5`, `#F0EEE6`)
- Deep ink typography (`#141413`)
- Terracotta accents (`#D97757`)
- Full accessibility and mobile responsiveness

---

## 🛠️ Architecture & Tech Stack

```
POIDH Radar Architecture
┌────────────────────────────────────────────────────────┐
│                   Next.js 14 (App Router)              │
│  ┌──────────────────┬───────────────────────────────┐  │
│  │ Server Pages     │ Interactive Client Components │  │
│  │ • /              │ • BountyUniverse (Canvas)     │  │
│  │ • /bounties      │ • BountyExplorer (FilterRail) │  │
│  │ • /chains        │ • SurpriseMeModal             │  │
│  │ • /bounty/[c]/[id│ • ScoreBreakdownModal         │  │
│  └──────────────────┴───────────────────────────────┘  │
├────────────────────────────────────────────────────────┤
│                   Scoring & Data Layer                 │
│  ┌──────────────────┬───────────────────────────────┐  │
│  │ Radar Algorithm  │ POIDH Protocol Adapter        │  │
│  │ • Freshness      │ • Multi-chain REST fetching   │  │
│  │ • Reward Log     │ • BigInt / Wei Normalization  │  │
│  │ • Competition    │ • Fallback Baseline Snapshot  │  │
│  └──────────────────┴───────────────────────────────┘  │
├────────────────────────────────────────────────────────┤
│                     Tailwind CSS                       │
│      Warm Paper Palette • Lucide Icons • Typography    │
└────────────────────────────────────────────────────────┘
```

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router, Server Components & React 18)
- **Language:** [TypeScript](https://www.typescriptlang.org/) for complete type safety
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with custom paper theme
- **Icons:** [Lucide React](https://lucide.dev/) + Custom SVG Chain Badges
- **Data Engine:** Public POIDH Protocol API (`https://poidh.xyz/[chain]/bounty/[id]/data`)

---

## 📁 Project Structure

```
poidh-radar/
├── app/
│   ├── api/
│   │   └── bounties/       # Multi-chain aggregated JSON endpoint
│   ├── bounties/           # Full interactive explorer page
│   ├── bounty/[chain]/[id] # Detailed individual bounty showcase page
│   ├── chains/             # Ecosystem networks analytics page
│   ├── globals.css         # Custom typography and paper theme styles
│   ├── layout.tsx          # Root layout with header, footer & metadata
│   ├── page.tsx            # Home dashboard with Hero, Universe & Curations
│   └── icon.png            # Application favicon & brand icon
├── components/
│   ├── bounty/             # Submission gallery & claim lightbox
│   ├── discovery/          # HeroSection, HotBounties, HiddenGems, SurpriseMeModal
│   ├── explorer/           # BountyExplorer, FilterRail, BountyTable, Search
│   ├── layout/             # Sticky Navbar & Footer
│   ├── ui/                 # ChainIcon, Badge, Modal, Tooltip, Skeleton
│   └── visual/             # BountyUniverse canvas & ScoreBreakdownModal
├── lib/
│   ├── poidh/              # Types, Chain configs, Multi-chain client adapter
│   ├── scoring/            # Radar Score calculation algorithm
│   └── utils/              # Formatting, Wei conversions, Tailwind cn helper
├── public/
│   ├── chains/             # Arbitrum, Degen, Base network badges
│   └── logo.png            # POIDH Radar shutter logo
├── tailwind.config.js      # Custom theme colors, shadows, animations
├── tsconfig.json           # TypeScript configuration
└── package.json            # Scripts and dependencies
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.17+ or later
- npm, pnpm, or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/EFTAKHAR-AMIN-SAKIB/poidh-radar.git
   cd poidh-radar
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📦 Build for Production

```bash
# Build the Next.js production bundle
npm run build

# Start the production server
npm run start
```

---

## 🧪 Verification & Automated Testing

POIDH Radar includes a rigorous test suite and mathematical audit tools ensuring strict monotonicity, USD cross-chain parity, and zero tie collisions:

```bash
# Run core test suites (228 assertions)
node tests/test-core.mjs

# Run static deployment and integrity checks (74 assertions)
node tests/test-static.mjs

# Run Radar Score v2 property test suite (monotonicity, USD parity, edge cases)
npx ts-node tests/test-radar.ts

# Run scoring empirical audit & brute-force grid analysis
node scripts/audit-radar-score.cjs

# Run variance decomposition across live indexed snapshot
node scripts/audit-radar-variance.cjs
```

### 📊 Radar Score v2 Benchmark Results
- **Strict Monotonicity:** ✅ Verified across all claim count tiers (`more competition → strictly lower score`).
- **USD Parity:** ✅ `0.00` points drift between ETH and DEGEN rewards across \$5–\$2,800 USD spectrum.
- **Score Range:** ✅ Covers full 1–93 scale for realistic discoverability without artificial clipping.
- **Robust Wei Coercion:** ✅ Immune to hexadecimal (`0x...`), scientific notation (`1e18`), and decimal strings.

---

## 📄 License

Distributed under the **MIT License**.

---

<div align="center">
  <sub>Built with ❤️ for the onchain builder community. Powered by POIDH protocol data.</sub>
</div>
