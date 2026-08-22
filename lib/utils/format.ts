import { BountyStatus } from "../poidh/types";

export function weiToNumber(wei: string | null | undefined, decimals = 18): number {
  if (!wei) return 0;
  try {
    let s = wei.trim();
    if (s === "") return 0;

    // Handle hex strings: "0x16345785d8a0000" → BigInt → decimal string
    if (/^-?0x[0-9a-fA-F]+$/i.test(s)) {
      const neg = s.startsWith("-");
      const hex = neg ? s.slice(1) : s;
      const bigVal = BigInt(hex);
      s = (neg ? "-" : "") + bigVal.toString();
    }

    // Handle scientific notation: "1e18" → full decimal string
    if (/[eE]/.test(s) && !s.includes("x")) {
      const num = Number(s);
      if (!isFinite(num) || num === 0) return 0;
      // Convert to full integer string (no scientific notation)
      s = BigInt(Math.round(num)).toString();
    }

    // If the string contains a decimal point, it's likely already in human units
    // (e.g. "1500000000000000000.0" is a malformed wei, but "1.5" is human ETH)
    // Heuristic: if it has a decimal AND is very large (>= 1e15), treat it as
    // wei with a trailing .0 artefact → strip the decimal portion
    if (s.includes(".")) {
      const num = parseFloat(s);
      if (!isFinite(num)) return 0;
      // If the integer part is large enough to be wei, strip fractional part
      const intPart = s.split(".")[0].replace("-", "");
      if (intPart.length >= 15) {
        s = s.split(".")[0]; // treat as integer wei
      } else {
        // Small number with decimal → already in human units
        return num;
      }
    }

    // Standard integer wei → human-readable conversion
    const neg = s.startsWith("-");
    const clean = s.replace("-", "");
    if (clean.length <= decimals) {
      const padded = clean.padStart(decimals + 1, "0");
      const dotPos = padded.length - decimals;
      const numStr = padded.slice(0, dotPos) + "." + padded.slice(dotPos);
      return (neg ? -1 : 1) * parseFloat(numStr);
    } else {
      const whole = clean.slice(0, clean.length - decimals);
      const frac = clean.slice(clean.length - decimals, clean.length - decimals + 6);
      return (neg ? -1 : 1) * parseFloat(`${whole}.${frac}`);
    }
  } catch {
    return 0;
  }
}

export function formatWei(wei: string | null | undefined, decimals = 18): string {
  if (!wei) return "—";
  const num = weiToNumber(wei, decimals);
  if (num === 0) return "0";

  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 10_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  if (num >= 1) {
    return num.toLocaleString("en-US", { maximumFractionDigits: 3 });
  }
  if (num >= 0.0001) {
    return num.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  }
  return num.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatReward(
  amountWei: string | null | undefined,
  currency: string,
  priceUsd?: number | null
): { formatted: string; fullWithSymbol: string; usdEstimate: string | null } {
  const isDegen = currency.toUpperCase() === "DEGEN";
  const formatted = formatWei(amountWei, 18);
  const symbol = isDegen ? "DEGEN" : "ETH";
  const fullWithSymbol = `${formatted} ${symbol}`;

  let usdEstimate: string | null = null;
  if (priceUsd && priceUsd > 0) {
    usdEstimate = `$${priceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else {
    // Fallback USD approximation
    const num = weiToNumber(amountWei, 18);
    if (num > 0) {
      if (!isDegen) {
        // Approximate ETH @ ~$2,800
        const approx = num * 2800;
        if (approx >= 0.01) {
          usdEstimate = `~$${approx.toLocaleString("en-US", { maximumFractionDigits: approx > 100 ? 0 : 2 })}`;
        }
      } else {
        // Approximate DEGEN @ ~$0.008
        const approx = num * 0.008;
        if (approx >= 0.01) {
          usdEstimate = `~$${approx.toLocaleString("en-US", { maximumFractionDigits: approx > 100 ? 0 : 2 })}`;
        }
      }
    }
  }

  return { formatted, fullWithSymbol, usdEstimate };
}

export function formatRelativeTime(ms: number | null | undefined, nowMs?: number): string {
  if (!ms) return "—";
  const now = nowMs || Date.now();
  const diff = Math.max(0, now - ms);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < month) return `${Math.floor(diff / day)}d ago`;
  if (diff < year) return `${Math.floor(diff / month)}mo ago`;
  return `${Math.floor(diff / year)}y ago`;
}

export function formatDate(ms: number | null | undefined): string {
  if (!ms) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(ms));
  } catch {
    return "—";
  }
}

export function shortenAddress(address: string | null | undefined): string {
  if (!address) return "—";
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function getStatusMeta(status: BountyStatus): {
  label: string;
  badgeClass: string;
  dotClass: string;
  textClass: string;
  description: string;
} {
  switch (status) {
    case "open":
      return {
        label: "OPEN",
        badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        dotClass: "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
        textClass: "text-emerald-400",
        description: "Open for claims — no winner decided yet.",
      };
    case "review":
      return {
        label: "IN REVIEW",
        badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        dotClass: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
        textClass: "text-amber-400",
        description: "Claims submitted — voting or creator evaluation in progress.",
      };
    case "paid":
      return {
        label: "COMPLETED",
        badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
        dotClass: "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]",
        textClass: "text-cyan-400",
        description: "Bounty claim accepted and rewarded to claimant.",
      };
    case "cancelled":
      return {
        label: "CANCELLED",
        badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        dotClass: "bg-rose-400",
        textClass: "text-rose-400",
        description: "Bounty was cancelled or funds refunded.",
      };
    default:
      return {
        label: "UNKNOWN",
        badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/20",
        dotClass: "bg-slate-400",
        textClass: "text-slate-400",
        description: "Status undetermined.",
      };
  }
}
