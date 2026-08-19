import React from "react";
import { ChainSlug } from "@/lib/poidh/types";
import { cn } from "@/lib/utils/cn";

interface ChainIconProps {
  chain: ChainSlug | string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function ChainIcon({ chain, size = "md", className }: ChainIconProps) {
  const c = chain ? chain.toLowerCase().trim() : "base";

  const sizeClasses = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
    xl: "w-6 h-6",
  };

  const sz = sizeClasses[size];

  // 1. BASE LOGO (Official Coinbase Base Blue Disc)
  if (c === "base" || c === "8453") {
    return (
      <svg
        viewBox="0 0 115 115"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(sz, "flex-shrink-0 inline-block", className)}
        title="Base Network"
      >
        <circle cx="57.5" cy="57.5" r="57.5" fill="#0052FF" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M57.5 98C80.4198 98 99 79.4198 99 56.5C99 33.5802 80.4198 15 57.5 15C35.0863 15 16.7869 32.7483 16.0234 54.9474H70.7632V58.0526H16.0234C16.7869 80.2517 35.0863 98 57.5 98Z"
          fill="white"
        />
      </svg>
    );
  }

  // 2. ARBITRUM LOGO (Official Hexagonal Badge with Light Blue Border)
  if (c === "arbitrum" || c === "42161") {
    return (
      <img
        src="/chains/arbitrum.png"
        alt="Arbitrum One"
        className={cn(sz, "flex-shrink-0 inline-block object-contain", className)}
        title="Arbitrum One"
      />
    );
  }

  // 3. ETHEREUM MAINNET LOGO (Official Ethereum Diamond)
  if (c === "mainnet" || c === "ethereum" || c === "1" || c === "eth") {
    return (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(sz, "flex-shrink-0 inline-block", className)}
        title="Ethereum Mainnet"
      >
        <circle cx="16" cy="16" r="16" fill="#627EEA" />
        <g fill="#FFFFFF">
          <path d="M16 4.5L15.86 4.97V18.17L16 18.31L21.58 15.09L16 4.5Z" fillOpacity="0.8" />
          <path d="M16 4.5L10.42 15.09L16 18.31V4.5Z" />
          <path d="M16 19.52L15.91 19.63V26.86L16 27.12L21.58 16.4L16 19.52Z" fillOpacity="0.8" />
          <path d="M16 27.12V19.52L10.42 16.4L16 27.12Z" />
          <path d="M16 18.31L21.58 15.09L16 12.45V18.31Z" fillOpacity="0.5" />
          <path d="M10.42 15.09L16 18.31V12.45L10.42 15.09Z" fillOpacity="0.8" />
        </g>
      </svg>
    );
  }

  // 4. DEGEN CHAIN LOGO (Official Purple Top Hat matching user asset)
  if (c === "degen" || c === "666666666" || c === "0x27bc86aa") {
    return (
      <img
        src="/chains/degen.png"
        alt="Degen Chain"
        className={cn(sz, "flex-shrink-0 inline-block object-contain", className)}
        title="Degen Chain"
      />
    );
  }

  return (
    <div
      className={cn(
        sz,
        "rounded-full bg-[#E5E4DF] flex items-center justify-center text-[10px] font-bold text-[#141413]",
        className
      )}
    >
      🌐
    </div>
  );
}
