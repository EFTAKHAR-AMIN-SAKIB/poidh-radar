"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, Flame, RotateCcw, Sparkles, ZoomIn, ZoomOut } from "lucide-react";
import { CHAINS, CHAIN_ORDER } from "@/lib/poidh/chains";
import { Bounty, ChainSlug } from "@/lib/poidh/types";
import { formatReward } from "@/lib/utils/format";
import { ChainBadge, StatusBadge } from "../ui/Badge";
import { ChainIcon } from "../ui/ChainIcon";

interface BountyUniverseProps {
  bounties: Bounty[];
}

interface Node {
  bounty: Bounty;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  chain: ChainSlug;
  color: string;
  brightColor: string;
  glowColor: string;
  orbitAngle: number;
  orbitSpeed: number;
  orbitRadius: number;
  centerX: number;
  centerY: number;
  isHighRadar: boolean;
}

const CHAIN_VISUALS: Record<
  ChainSlug,
  {
    name: string;
    shortName: string;
    color: string;
    brightColor: string;
    glowColor: string;
    ringColor: string;
    faintRingColor: string;
    badgeBg: string;
    badgeBorder: string;
  }
> = {
  base: {
    name: "Base",
    shortName: "BASE",
    color: "#0052FF",
    brightColor: "#3B82F6",
    glowColor: "rgba(0, 82, 255, 0.35)",
    ringColor: "rgba(0, 82, 255, 0.22)",
    faintRingColor: "rgba(0, 82, 255, 0.08)",
    badgeBg: "rgba(0, 82, 255, 0.08)",
    badgeBorder: "rgba(0, 82, 255, 0.3)",
  },
  degen: {
    name: "Degen",
    shortName: "DEGEN",
    color: "#A855F7",
    brightColor: "#C084FC",
    glowColor: "rgba(168, 85, 247, 0.35)",
    ringColor: "rgba(168, 85, 247, 0.22)",
    faintRingColor: "rgba(168, 85, 247, 0.08)",
    badgeBg: "rgba(168, 85, 247, 0.08)",
    badgeBorder: "rgba(168, 85, 247, 0.3)",
  },
  arbitrum: {
    name: "Arbitrum",
    shortName: "ARBITRUM",
    color: "#12AAFF",
    brightColor: "#38BDF8",
    glowColor: "rgba(18, 170, 255, 0.35)",
    ringColor: "rgba(18, 170, 255, 0.22)",
    faintRingColor: "rgba(18, 170, 255, 0.08)",
    badgeBg: "rgba(18, 170, 255, 0.08)",
    badgeBorder: "rgba(18, 170, 255, 0.3)",
  },
  mainnet: {
    name: "Ethereum",
    shortName: "MAINNET",
    color: "#627EEA",
    brightColor: "#818CF8",
    glowColor: "rgba(98, 126, 234, 0.35)",
    ringColor: "rgba(98, 126, 234, 0.22)",
    faintRingColor: "rgba(98, 126, 234, 0.08)",
    badgeBg: "rgba(98, 126, 234, 0.08)",
    badgeBorder: "rgba(98, 126, 234, 0.3)",
  },
};

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

export function BountyUniverse({ bounties }: BountyUniverseProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{ node: Node; screenX: number; screenY: number } | null>(null);
  const [hoveredHub, setHoveredHub] = useState<ChainSlug | null>(null);
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
  const [activeChain, setActiveChain] = useState<ChainSlug | "all">("all");
  const [zoom, setZoom] = useState(1);
  const nodesRef = useRef<Node[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const logosRef = useRef<Record<string, HTMLImageElement>>({});

  // Chain counts
  const chainCounts = useMemo(() => {
    const counts: Record<ChainSlug, number> = { base: 0, degen: 0, arbitrum: 0, mainnet: 0 };
    for (const b of bounties) {
      if (counts[b.chain] !== undefined) {
        counts[b.chain]++;
      }
    }
    return counts;
  }, [bounties]);

  // Preload crisp chain network logos
  useEffect(() => {
    const images: Record<string, HTMLImageElement> = {};

    // 1. Base Logo SVG
    const baseImg = new Image();
    baseImg.src = `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 115 115">
        <circle cx="57.5" cy="57.5" r="57.5" fill="#0052FF"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M57.5 98C80.4198 98 99 79.4198 99 56.5C99 33.5802 80.4198 15 57.5 15C35.0863 15 16.7869 32.7483 16.0234 54.9474H70.7632V58.0526H16.0234C16.7869 80.2517 35.0863 98 57.5 98Z" fill="white"/>
      </svg>
    `)}`;
    images.base = baseImg;

    // 2. Ethereum Mainnet Logo SVG
    const ethImg = new Image();
    ethImg.src = `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="16" fill="#627EEA"/>
        <g fill="#FFFFFF">
          <path d="M16 4.5L15.86 4.97V18.17L16 18.31L21.58 15.09L16 4.5Z" fill-opacity="0.8"/>
          <path d="M16 4.5L10.42 15.09L16 18.31V4.5Z"/>
          <path d="M16 19.52L15.91 19.63V26.86L16 27.12L21.58 16.4L16 19.52Z" fill-opacity="0.8"/>
          <path d="M16 27.12V19.52L10.42 16.4L16 27.12Z"/>
          <path d="M16 18.31L21.58 15.09L16 12.45V18.31Z" fill-opacity="0.5"/>
          <path d="M10.42 15.09L16 18.31V12.45L10.42 15.09Z" fill-opacity="0.8"/>
        </g>
      </svg>
    `)}`;
    images.mainnet = ethImg;

    // 3. Arbitrum Logo
    const arbImg = new Image();
    arbImg.src = "/chains/arbitrum.png";
    images.arbitrum = arbImg;

    // 4. Degen Logo
    const degenImg = new Image();
    degenImg.src = "/chains/degen.png";
    images.degen = degenImg;

    logosRef.current = images;
  }, []);

  // Initialize node positions clustered by chain
  useEffect(() => {
    if (!bounties || bounties.length === 0) return;

    const filtered = activeChain === "all" ? bounties : bounties.filter((b) => b.chain === activeChain);
    const sample = filtered.slice(0, 200);

    const isSingleChain = activeChain !== "all";

    const chainCenters: Record<ChainSlug, { x: number; y: number }> = isSingleChain
      ? {
          base: { x: 0, y: 0 },
          degen: { x: 0, y: 0 },
          arbitrum: { x: 0, y: 0 },
          mainnet: { x: 0, y: 0 },
        }
      : {
          base: { x: -190, y: -100 },
          degen: { x: 190, y: -80 },
          arbitrum: { x: -150, y: 130 },
          mainnet: { x: 160, y: 125 },
        };

    const newNodes: Node[] = sample.map((b, idx) => {
      const center = chainCenters[b.chain] || { x: 0, y: 0 };
      const visual = CHAIN_VISUALS[b.chain] || CHAIN_VISUALS.base;

      const baseRadius = b.radarBreakdown?.rewardMagnitude
        ? Math.max(3.5, Math.min(8.5, (b.radarBreakdown.rewardMagnitude / 30) * 6 + 3.5))
        : 4.5;

      const shellCount = isSingleChain ? 16 : 10;
      const shellSpacing = isSingleChain ? 18 : 13;
      const orbitRadius = 42 + (idx % shellCount) * shellSpacing + Math.random() * 12;
      const orbitAngle = Math.random() * Math.PI * 2;
      const orbitSpeed = (0.0003 + Math.random() * 0.0006) * (idx % 2 === 0 ? 1 : -1);

      return {
        bounty: b,
        chain: b.chain,
        centerX: center.x,
        centerY: center.y,
        orbitRadius,
        orbitAngle,
        orbitSpeed,
        x: center.x + Math.cos(orbitAngle) * orbitRadius,
        y: center.y + Math.sin(orbitAngle) * orbitRadius,
        targetX: center.x + Math.cos(orbitAngle) * orbitRadius,
        targetY: center.y + Math.sin(orbitAngle) * orbitRadius,
        radius: baseRadius,
        color: visual.color,
        brightColor: visual.brightColor,
        glowColor: visual.glowColor,
        isHighRadar: b.radarScore >= 80,
      };
    });

    nodesRef.current = newNodes;
  }, [bounties, activeChain]);

  // Main Canvas Render Loop with High-DPI support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let displayWidth = canvas.parentElement?.clientWidth || 800;
    let displayHeight = Math.min(500, Math.max(380, displayWidth * 0.45));
    let dpr = window.devicePixelRatio || 1;

    const setupCanvasSize = () => {
      if (!canvas || !canvas.parentElement) return;
      displayWidth = canvas.parentElement.clientWidth;
      displayHeight = Math.min(500, Math.max(380, displayWidth * 0.45));
      dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(displayWidth * dpr);
      canvas.height = Math.floor(displayHeight * dpr);
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
    };

    setupCanvasSize();
    window.addEventListener("resize", setupCanvasSize);

    let startTime = performance.now();

    const render = (now: number) => {
      const elapsed = now - startTime;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      const cx = displayWidth / 2;
      const cy = displayHeight / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);

      // Define chain centers based on active filter
      const isSingleChain = activeChain !== "all";
      const chainHubs: { slug: ChainSlug; x: number; y: number }[] = isSingleChain
        ? [{ slug: activeChain as ChainSlug, x: 0, y: 0 }]
        : [
            { slug: "base", x: -190, y: -100 },
            { slug: "degen", x: 190, y: -80 },
            { slug: "arbitrum", x: -150, y: 130 },
            { slug: "mainnet", x: 160, y: 125 },
          ];

      // 1. Draw Chain Hubs, Rings & Logos
      chainHubs.forEach((hub, idx) => {
        const visual = CHAIN_VISUALS[hub.slug];
        if (!visual) return;

        const hubRadius = 18;
        const pulse = Math.sin(elapsed * 0.003 + idx) * 2;

        // Subtle outer glowing pulse aura
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, hubRadius + 8 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = visual.glowColor;
        ctx.fill();

        // Multi-tier orbital rings with chain's signature tint
        const ringRadii = isSingleChain ? [70, 130, 190, 250, 310] : [65, 125, 185];

        ringRadii.forEach((r, rIdx) => {
          ctx.strokeStyle = rIdx === 0 ? visual.ringColor : visual.faintRingColor;
          ctx.lineWidth = rIdx === 0 ? 1.2 : 1;
          if (rIdx === 0) {
            ctx.setLineDash([3, 4]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.beginPath();
          ctx.arc(hub.x, hub.y, r, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.setLineDash([]);

        // Hub Background Disc (Crisp card aesthetic with shadow)
        ctx.save();
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, hubRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        ctx.fill();

        // Draw Official Network Logo clipped inside the circle
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, hubRadius - 1.5, 0, Math.PI * 2);
        ctx.clip();

        const logoImg = logosRef.current[hub.slug];
        if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
          ctx.drawImage(
            logoImg,
            hub.x - (hubRadius - 1.5),
            hub.y - (hubRadius - 1.5),
            (hubRadius - 1.5) * 2,
            (hubRadius - 1.5) * 2
          );
        } else {
          // Fallback colored disc with letter
          ctx.fillStyle = visual.color;
          ctx.fill();
          ctx.font = "bold 11px sans-serif";
          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(visual.name[0], hub.x, hub.y);
        }
        ctx.restore();

        // Hub Crisp Border in Chain Color
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, hubRadius, 0, Math.PI * 2);
        ctx.strokeStyle = visual.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Chain Name & Count Badge Pill below the hub
        const labelY = hub.y + hubRadius + 14;
        const count = chainCounts[hub.slug] || 0;
        const labelText = visual.shortName;
        const countText = `${count}`;

        ctx.font = "bold 9px monospace";
        const textWidth = ctx.measureText(labelText).width;
        ctx.font = "8px monospace";
        const countWidth = ctx.measureText(countText).width;
        const pillWidth = textWidth + countWidth + 16;
        const pillHeight = 16;
        const pillX = hub.x - pillWidth / 2;
        const pillY = labelY - 9;

        // Rounded pill background
        ctx.fillStyle = visual.badgeBg;
        ctx.strokeStyle = visual.badgeBorder;
        ctx.lineWidth = 1;
        drawRoundRect(ctx, pillX, pillY, pillWidth, pillHeight, 4);
        ctx.fill();
        ctx.stroke();

        // Badge Text
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = "bold 9px monospace";
        ctx.fillStyle = visual.color;
        ctx.fillText(labelText, pillX + 5, labelY - 1);

        ctx.font = "8px monospace";
        ctx.fillStyle = "#6B6B67";
        ctx.fillText(countText, pillX + textWidth + 8, labelY - 1);
      });

      // 2. Draw Orbiting Bounty Dots (Colored to match their main network)
      for (const node of nodesRef.current) {
        node.orbitAngle += node.orbitSpeed;
        node.x = node.centerX + Math.cos(node.orbitAngle) * node.orbitRadius;
        node.y = node.centerY + Math.sin(node.orbitAngle) * node.orbitRadius;

        const isHovered = hoveredNode?.node.bounty.id === node.bounty.id && hoveredNode?.node.bounty.chain === node.bounty.chain;

        // Connect hovered node to hub with animated dashed laser ray
        if (isHovered) {
          ctx.save();
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 1.2;
          ctx.setLineDash([3, 3]);
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.moveTo(node.centerX, node.centerY);
          ctx.lineTo(node.x, node.y);
          ctx.stroke();
          ctx.restore();
        }

        // High Radar Score Nodes: Glow Halo Pulse
        if (node.isHighRadar) {
          const haloPulse = Math.sin(elapsed * 0.005 + node.orbitAngle) * 1.5;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 3 + haloPulse, 0, Math.PI * 2);
          ctx.fillStyle = node.glowColor;
          ctx.fill();
        }

        // Hover Target Ring
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Main Dot Body
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.globalAlpha = node.isHighRadar ? 1.0 : 0.88;
        ctx.fill();

        // Crisp White/Accent Dot Border for clarity
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = node.isHighRadar ? "#FFFFFF" : "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = node.isHighRadar ? 1.5 : 1;
        ctx.stroke();

        // Inner luminous spark for High Radar bounties
        if (node.isHighRadar) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, Math.max(1.2, node.radius * 0.35), 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();
        }
      }

      ctx.restore(); // restore zoom & translate
      ctx.restore(); // restore dpr

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", setupCanvasSize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [zoom, activeChain, chainCounts, hoveredNode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const scaledX = x / zoom;
    const scaledY = y / zoom;

    // Check hit on bounty nodes
    let hitNode: Node | null = null;
    for (const node of nodesRef.current) {
      const dist = Math.hypot(node.x - scaledX, node.y - scaledY);
      if (dist <= node.radius + 5) {
        hitNode = node;
        break;
      }
    }

    if (hitNode) {
      setHoveredNode({
        node: hitNode,
        screenX: e.clientX,
        screenY: e.clientY,
      });
      setHoveredHub(null);
      return;
    }

    setHoveredNode(null);

    // Check hit on chain hubs
    const isSingleChain = activeChain !== "all";
    const chainHubs: { slug: ChainSlug; x: number; y: number }[] = isSingleChain
      ? [{ slug: activeChain as ChainSlug, x: 0, y: 0 }]
      : [
          { slug: "base", x: -190, y: -100 },
          { slug: "degen", x: 190, y: -80 },
          { slug: "arbitrum", x: -150, y: 130 },
          { slug: "mainnet", x: 160, y: 125 },
        ];

    let hitHub: ChainSlug | null = null;
    for (const hub of chainHubs) {
      const dist = Math.hypot(hub.x - scaledX, hub.y - scaledY);
      if (dist <= 24) {
        hitHub = hub.slug;
        break;
      }
    }
    setHoveredHub(hitHub);
  };

  const handleClick = () => {
    if (hoveredNode) {
      setSelectedBounty(hoveredNode.node.bounty);
    } else if (hoveredHub) {
      setActiveChain(hoveredHub);
    }
  };

  return (
    <div className="relative rounded-xl border border-[#E5E4DF] bg-[#FFFFFF] shadow-paper overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 border-b border-[#E5E4DF] bg-[#FAF9F5]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[#F0EEE6] border border-[#E5E4DF] text-[#D97757]">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#141413] text-sm sm:text-base">
                Bounty Constellation
              </h3>
              <span className="text-[10px] font-mono font-medium text-[#D97757] bg-[#D97757]/10 border border-[#D97757]/20 px-2 py-0.5 rounded">
                Live Galaxy
              </span>
            </div>
            <p className="text-xs text-[#6B6B67]">
              Multi-chain orbital map • Sized by reward magnitude, color-coded by network
            </p>
          </div>
        </div>

        {/* Chain Filters & Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveChain("all")}
            className={`text-xs font-mono px-2.5 py-1 rounded-md border transition-all ${
              activeChain === "all"
                ? "bg-[#FFFFFF] text-[#141413] font-bold border-[#D1D0C9] shadow-sm ring-1 ring-[#141413]/10"
                : "bg-transparent text-[#6B6B67] border-transparent hover:text-[#141413] hover:bg-[#F0EEE6]/80"
            }`}
          >
            All Clusters ({bounties.length})
          </button>
          {CHAIN_ORDER.map((c) => {
            const cfg = CHAINS[c];
            const visual = CHAIN_VISUALS[c];
            const isSelected = activeChain === c;
            return (
              <button
                key={c}
                onClick={() => setActiveChain(c)}
                className={`text-xs font-mono px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#FFFFFF] text-[#141413] font-bold border-[#D1D0C9] shadow-sm ring-1"
                    : "bg-transparent text-[#6B6B67] border-transparent hover:text-[#141413] hover:bg-[#F0EEE6]/80"
                }`}
                style={{
                  boxShadow: isSelected ? `0 0 0 1px ${visual.color}` : undefined,
                  borderColor: isSelected ? visual.color : undefined,
                }}
              >
                <ChainIcon chain={c} size="xs" />
                <span>{cfg.shortName}</span>
                <span className="text-[10px] opacity-60 font-normal">
                  {chainCounts[c] || 0}
                </span>
              </button>
            );
          })}

          <div className="hidden sm:flex items-center gap-1 border-l border-[#E5E4DF] pl-2 ml-1">
            <button
              onClick={() => setZoom((z) => Math.min(1.8, z + 0.2))}
              className="p-1 text-[#6B6B67] hover:text-[#141413] hover:bg-[#F0EEE6] rounded transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
              className="p-1 text-[#6B6B67] hover:text-[#141413] hover:bg-[#F0EEE6] rounded transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 text-[#6B6B67] hover:text-[#141413] hover:bg-[#F0EEE6] rounded transition-colors"
              title="Reset view"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={containerRef}
        className={`relative w-full h-[380px] sm:h-[440px] bg-[#FAF9F5] select-none ${
          hoveredHub ? "cursor-pointer" : "cursor-crosshair"
        }`}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            setHoveredNode(null);
            setHoveredHub(null);
          }}
          onClick={handleClick}
          className="w-full h-full block"
        />

        {/* Legend */}
        <div className="absolute bottom-3 left-3 p-2.5 rounded-lg border border-[#E5E4DF] bg-[#FFFFFF]/95 backdrop-blur-sm flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#6B6B67] shadow-sm">
          <div className="flex items-center gap-1.5 font-semibold text-[#141413]">
            <span className="text-[10px] text-[#8E8E8A] uppercase tracking-wider">Networks:</span>
          </div>
          {CHAIN_ORDER.map((c) => {
            const visual = CHAIN_VISUALS[c];
            return (
              <div key={c} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white shadow-sm flex-shrink-0"
                  style={{ backgroundColor: visual.color }}
                />
                <span className="font-medium text-[#141413]">{visual.name}</span>
              </div>
            );
          })}
          <div className="w-px h-3 bg-[#E5E4DF] hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D97757] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D97757]"></span>
            </span>
            <span className="text-[#D97757] font-semibold">Radar 80+ Glow</span>
          </div>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredNode && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 p-3 rounded-lg border border-[#E5E4DF] bg-[#FFFFFF] shadow-paper-md w-64 space-y-2 animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${hoveredNode.screenX}px`,
            top: `${hoveredNode.screenY - 10}px`,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <ChainBadge chain={hoveredNode.node.bounty.chain} size="sm" />
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#D97757]">
              <Flame className="w-3 h-3 fill-[#D97757]" />
              <span>{hoveredNode.node.bounty.radarScore}</span>
            </div>
          </div>
          <div className="text-xs font-bold text-[#141413] line-clamp-2">
            {hoveredNode.node.bounty.title}
          </div>
          <div className="flex items-center justify-between text-xs font-mono pt-1.5 border-t border-[#E5E4DF]">
            <span className="text-[#8E8E8A]">Reward:</span>
            <span className="font-bold text-[#141413]">
              {formatReward(hoveredNode.node.bounty.amountWei, hoveredNode.node.bounty.currency).fullWithSymbol}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#8E8E8A]">
            <span>Claims: {hoveredNode.node.bounty.claimCount}</span>
            <span className="capitalize">{hoveredNode.node.bounty.status}</span>
          </div>
        </div>
      )}

      {/* Selected Bounty Quick Action Panel */}
      {selectedBounty && (
        <div className="p-4 border-t border-[#E5E4DF] bg-[#F0EEE6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-bottom duration-150">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <ChainBadge chain={selectedBounty.chain} size="sm" />
              <StatusBadge status={selectedBounty.status} size="sm" />
              <span className="text-xs font-mono text-[#D97757] font-bold">
                Radar {selectedBounty.radarScore}
              </span>
            </div>
            <h4 className="text-sm font-bold text-[#141413] line-clamp-1">
              {selectedBounty.title}
            </h4>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase text-[#8E8E8A]">Reward</div>
              <div className="font-mono text-sm font-bold text-[#141413]">
                {formatReward(selectedBounty.amountWei, selectedBounty.currency).fullWithSymbol}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedBounty(null)}
                className="text-xs font-mono px-2.5 py-1.5 rounded border border-[#E5E4DF] bg-[#FFFFFF] text-[#6B6B67] hover:text-[#141413] transition-colors"
              >
                Dismiss
              </button>
              <Link
                href={`/bounty/${selectedBounty.chain}/${selectedBounty.id}`}
                className="inline-flex items-center gap-1 text-xs font-mono font-medium px-3.5 py-1.5 rounded bg-[#D97757] text-white hover:bg-[#CC785C] transition-colors shadow-sm"
              >
                <span>View Bounty</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
