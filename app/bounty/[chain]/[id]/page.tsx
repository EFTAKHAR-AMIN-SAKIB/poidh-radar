import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  ExternalLink,
  Flame,
  Globe,
  Image as ImageIcon,
  Info,
  Layers,
  Radar,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { CHAINS } from "@/lib/poidh/chains";
import { fetchLiveBounty, getAllBounties } from "@/lib/poidh/client";
import { ChainSlug } from "@/lib/poidh/types";
import { formatDate, formatRelativeTime, formatReward, getStatusMeta, shortenAddress } from "@/lib/utils/format";
import { SubmissionGallery } from "@/components/bounty/SubmissionGallery";
import { ChainBadge, StatusBadge, TagBadge } from "@/components/ui/Badge";
import { ChainIcon } from "@/components/ui/ChainIcon";

interface BountyDetailPageProps {
  params: {
    chain: string;
    id: string;
  };
}

export async function generateMetadata({
  params,
}: BountyDetailPageProps): Promise<Metadata> {
  const chain = params.chain.toLowerCase() as ChainSlug;
  const id = parseInt(params.id, 10);
  const bounty = await fetchLiveBounty(chain, id);

  if (!bounty) {
    return {
      title: "Bounty Not Found — POIDH Radar",
    };
  }

  const rewardInfo = formatReward(bounty.amountWei, bounty.currency, bounty.priceUsd);

  return {
    title: `${bounty.title} (${rewardInfo.fullWithSymbol}) — POIDH Radar`,
    description: bounty.description || `Discover onchain bounty #${bounty.id} on ${bounty.chainLabel}.`,
    openGraph: {
      title: `${bounty.title} — ${bounty.chainLabel}`,
      description: `Reward: ${rewardInfo.fullWithSymbol} • Score: ${bounty.radarScore}/100 • Status: ${bounty.status.toUpperCase()}`,
      images: bounty.proofImage ? [{ url: bounty.proofImage }] : [],
    },
  };
}

export const revalidate = 30;

export default async function BountyDetailPage({ params }: BountyDetailPageProps) {
  const chain = params.chain.toLowerCase() as ChainSlug;
  const id = parseInt(params.id, 10);

  if (isNaN(id) || id <= 0) notFound();

  let bounty = await fetchLiveBounty(chain, id);
  if (!bounty) {
    const all = await getAllBounties();
    bounty = all.find((b) => b.chain === chain && b.id === id) || null;
  }

  if (!bounty) {
    notFound();
  }

  const chainConfig = CHAINS[bounty.chain] || CHAINS.base;
  const statusMeta = getStatusMeta(bounty.status);
  const rewardInfo = formatReward(bounty.amountWei, bounty.currency, bounty.priceUsd);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/bounties"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-[#6B6B67] hover:text-[#141413] border border-[#E5E4DF] bg-[#FFFFFF] px-3 py-1.5 rounded-md shadow-paper transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Explorer</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <ChainBadge chain={bounty.chain} size="md" />
          <StatusBadge status={bounty.status} size="md" />
          {bounty.isMultiplayer && (
            <span className="text-xs font-mono text-[#6B6B67] bg-[#F0EEE6] border border-[#E5E4DF] px-2 py-0.5 rounded-md flex items-center gap-1">
              <Users className="w-3 h-3" /> Multiplayer
            </span>
          )}
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] p-6 sm:p-8 space-y-6 shadow-paper">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          {/* Left Title & Info */}
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono text-[#8E8E8A] flex-wrap">
              <span className="inline-flex items-center gap-1 text-[#141413] font-semibold">
                <ChainIcon chain={bounty.chain} size="sm" />
                <span>{chainConfig.name}</span>
              </span>
              <span>•</span>
              <span>Bounty #{bounty.id}</span>
              {bounty.createdAt && (
                <>
                  <span>•</span>
                  <span>Posted {formatRelativeTime(bounty.createdAt)} ({formatDate(bounty.createdAt)})</span>
                </>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#141413] leading-tight">
              {bounty.title}
            </h1>

            {/* Standout Signal Pills */}
            {bounty.standoutTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {bounty.standoutTags.map((tag) => (
                  <TagBadge key={tag} size="md">
                    {tag}
                  </TagBadge>
                ))}
              </div>
            )}
          </div>

          {/* Reward & Radar Score Sidecard (Spacious Vertical Layout) */}
          <div className="p-5 rounded-xl border border-[#E5E4DF] bg-[#F0EEE6] flex flex-col justify-between gap-4 w-full sm:w-auto sm:min-w-[280px] lg:min-w-[300px] shadow-paper">
            {/* 1. Bounty Reward Section */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#8E8E8A] block">
                Bounty Reward
              </span>
              <div className="font-mono text-2xl sm:text-3xl font-bold text-[#141413]">
                {rewardInfo.fullWithSymbol}
              </div>
              {rewardInfo.usdEstimate && (
                <div className="text-xs font-mono text-[#6B6B67]">
                  {rewardInfo.usdEstimate} estimated
                </div>
              )}
            </div>

            {/* 2. Radar Discovery Score Section */}
            <div className="pt-3 border-t border-[#E5E4DF] space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[10px] uppercase font-semibold text-[#8E8E8A]">
                  Radar Score
                </span>
                <div className="flex items-center gap-1 font-bold text-[#D97757]">
                  <Flame className="w-3.5 h-3.5 fill-[#D97757]" />
                  <span>{bounty.radarScore} / 100</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-[#E5E4DF] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#D97757] transition-all"
                  style={{ width: `${bounty.radarScore}%` }}
                />
              </div>
            </div>

            {/* 3. Dedicated Clean Action Button */}
            <div className="pt-1">
              <a
                href={bounty.url}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#D97757] hover:bg-[#CC785C] text-white font-mono text-xs font-bold transition-all shadow-sm active:translate-y-0.5"
              >
                <span>Open on POIDH</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Description & Claims Gallery */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: The Bounty Description */}
          <div className="rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] p-6 space-y-3 shadow-paper">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#6B6B67] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#D97757]" />
              <span>Bounty Criteria & Instructions</span>
            </h2>

            {bounty.description ? (
              <div className="text-sm text-[#141413] leading-relaxed whitespace-pre-wrap font-sans bg-[#F0EEE6] p-4 rounded-lg border border-[#E5E4DF]">
                {bounty.description}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-[#F0EEE6] border border-[#E5E4DF] text-xs font-mono text-[#6B6B67]">
                No extra description provided by the issuer. Refer to the title criteria.
              </div>
            )}
          </div>

          {/* Section: Submissions & Claims Gallery */}
          <div className="rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] p-6 space-y-4 shadow-paper">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#6B6B67] flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#D97757]" />
                <span>Proof Submissions ({bounty.claimCount})</span>
              </h2>
              {bounty.claimCount === 0 ? (
                <span className="text-xs font-mono text-[#D97757] bg-[#D97757]/10 px-2 py-0.5 rounded border border-[#D97757]/20">
                  0 claims — High opportunity
                </span>
              ) : (
                <span className="text-[11px] font-mono text-[#6B6B67]">
                  Click any proof to inspect details
                </span>
              )}
            </div>

            {/* Interactive Submission Gallery & Lightbox */}
            <SubmissionGallery
              bounty={bounty}
              claims={bounty.claims}
              chainSlug={bounty.chain}
            />
          </div>
        </div>

        {/* Right 1 Col: Snapshot & Radar Intelligence */}
        <div className="space-y-6">
          {/* Opportunity Snapshot */}
          <div className="rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] p-5 space-y-3 shadow-paper">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#6B6B67] flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#D97757]" />
              <span>Bounty Snapshot</span>
            </h3>

            <div className="space-y-2.5 divide-y divide-[#E5E4DF] text-xs font-mono">
              <div className="flex items-center justify-between pt-1.5">
                <span className="text-[#6B6B67]">Network</span>
                <div className="flex items-center gap-1.5 text-[#141413] font-bold">
                  <ChainIcon chain={bounty.chain} size="sm" />
                  <span>{chainConfig.name}</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#6B6B67]">Status</span>
                <span className="text-[#141413] font-bold uppercase">{bounty.status}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#6B6B67]">Multiplayer</span>
                <span className="text-[#141413]">{bounty.isMultiplayer ? "Yes" : "Solo"}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#6B6B67]">Submissions</span>
                <span className="text-[#141413] font-bold">{bounty.claimCount}</span>
              </div>
              {bounty.issuer && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[#6B6B67]">Creator Address</span>
                  <a
                    href={`${chainConfig.explorerUrl}/address/${bounty.issuer}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#D97757] hover:underline flex items-center gap-1"
                  >
                    <span>{shortenAddress(bounty.issuer)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {bounty.createdAt && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[#6B6B67]">Listed Date</span>
                  <span className="text-[#141413]">{formatDate(bounty.createdAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Radar Intelligence */}
          <div className="rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] p-5 space-y-3 shadow-paper">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#6B6B67] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D97757]" />
              <span>Radar Intelligence</span>
            </h3>

            <div className="space-y-2.5 text-xs leading-relaxed">
              {bounty.status === "open" && bounty.claimCount === 0 && (
                <div className="flex items-start gap-2 p-2.5 rounded bg-[#F0EEE6] border border-[#E5E4DF] text-[#141413] font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-[#D97757] flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero Submissions:</strong> No claims have been submitted yet. Prime opportunity for first verification.
                  </span>
                </div>
              )}

              {bounty.radarBreakdown.rewardMagnitude >= 20 && (
                <div className="flex items-start gap-2 p-2.5 rounded bg-[#F0EEE6] border border-[#E5E4DF] text-[#141413] font-mono">
                  <Coins className="w-3.5 h-3.5 text-[#D97757] flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>High Reward Tier:</strong> Above-average payout magnitude relative to other bounties on {chainConfig.name}.
                  </span>
                </div>
              )}

              {bounty.isMultiplayer && (
                <div className="flex items-start gap-2 p-2.5 rounded bg-[#F0EEE6] border border-[#E5E4DF] text-[#141413] font-mono">
                  <Users className="w-3.5 h-3.5 text-[#D97757] flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Multiplayer Format:</strong> Allows multiple participants to submit and share rewards.
                  </span>
                </div>
              )}

              <p className="text-xs text-[#6B6B67] font-mono pt-1">
                {bounty.radarBreakdown.explanation}
              </p>
            </div>
          </div>

          {/* Original Source Card */}
          <div className="rounded-xl border border-[#D97757]/30 bg-[#D97757]/5 p-5 space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#D97757]">
              Official Protocol
            </h3>
            <p className="text-xs text-[#6B6B67] leading-relaxed">
              POIDH Radar provides discovery and indexing. To claim, vote, or fund this bounty, visit the official POIDH application.
            </p>
            <a
              href={bounty.url}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-md bg-[#D97757] hover:bg-[#CC785C] text-white font-mono text-xs font-medium transition-colors shadow-sm"
            >
              <span>Open on POIDH ↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
