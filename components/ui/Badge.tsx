import React from "react";
import { CHAINS } from "@/lib/poidh/chains";
import { BountyStatus, ChainSlug } from "@/lib/poidh/types";
import { cn } from "@/lib/utils/cn";
import { getStatusMeta } from "@/lib/utils/format";
import { ChainIcon } from "./ChainIcon";

interface StatusBadgeProps {
  status: BountyStatus;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const meta = getStatusMeta(status);

  const statusStyles: Record<BountyStatus, { bg: string; text: string; border: string; dot: string }> = {
    open: {
      bg: "bg-[#F0EEE6]",
      text: "text-[#141413]",
      border: "border-[#E5E4DF]",
      dot: "bg-[#D97757]",
    },
    review: {
      bg: "bg-[#EBDBBC]/40",
      text: "text-[#141413]",
      border: "border-[#D4A27F]/50",
      dot: "bg-[#CC785C]",
    },
    paid: {
      bg: "bg-[#F0EEE6]",
      text: "text-[#6B6B67]",
      border: "border-[#E5E4DF]",
      dot: "bg-[#8E8E8A]",
    },
    cancelled: {
      bg: "bg-[#F0EEE6]/60",
      text: "text-[#8E8E8A]",
      border: "border-[#E5E4DF]",
      dot: "bg-[#B0AFA9]",
    },
    unknown: {
      bg: "bg-[#F0EEE6]",
      text: "text-[#6B6B67]",
      border: "border-[#E5E4DF]",
      dot: "bg-[#8E8E8A]",
    },
  };

  const style = statusStyles[status] || statusStyles.open;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono font-medium tracking-wide rounded-md border",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        style.bg,
        style.text,
        style.border,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
      <span>{meta.label}</span>
    </span>
  );
}

interface ChainBadgeProps {
  chain: ChainSlug;
  size?: "sm" | "md";
  className?: string;
  showIcon?: boolean;
}

export function ChainBadge({ chain, size = "md", className, showIcon = true }: ChainBadgeProps) {
  const config = CHAINS[chain] || CHAINS.base;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono font-medium rounded-md border border-[#E5E4DF] bg-[#F0EEE6] text-[#141413]",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        className
      )}
    >
      {showIcon && <ChainIcon chain={chain} size={size === "sm" ? "sm" : "md"} />}
      <span className="font-semibold">{config.shortName}</span>
    </span>
  );
}

interface TagBadgeProps {
  children: React.ReactNode;
  variant?: "terracotta" | "sand" | "ivory" | "default";
  size?: "sm" | "md";
  className?: string;
}

export function TagBadge({
  children,
  variant = "default",
  size = "sm",
  className,
}: TagBadgeProps) {
  const variantStyles = {
    default: "bg-[#F0EEE6] text-[#6B6B67] border-[#E5E4DF]",
    ivory: "bg-[#FFFFFF] text-[#141413] border-[#E5E4DF]",
    sand: "bg-[#EBDBBC]/40 text-[#141413] border-[#D4A27F]/40",
    terracotta: "bg-[#D97757]/10 text-[#D97757] border-[#D97757]/25 font-semibold",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-mono rounded border",
        size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2.5 py-1",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
