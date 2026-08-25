"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  ExternalLink,
  Flame,
  Globe,
  Layers,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { CHAINS, CHAIN_ORDER } from "@/lib/poidh/chains";
import { Bounty, ChainSlug } from "@/lib/poidh/types";
import { formatReward, formatRelativeTime } from "@/lib/utils/format";
import { ChainBadge, StatusBadge } from "../ui/Badge";
import { ChainIcon } from "../ui/ChainIcon";
import { ScoreBreakdownModal } from "./ScoreBreakdownModal";

interface BountyUniverseProps {
  bounties: Bounty[];
}

interface Node {
  bounty: Bounty;
  x: number;
  y: number;
  radius: number;
  chain: ChainSlug;
  color: string;
  brightColor: string;
  glowColor: string;
  orbitAngle: number;
  orbitSpeed: number;
  orbitRadius: number;
  hubX: number;
  hubY: number;
  isHighRadar: boolean;
  radarScore: number;
  amountNumber: number;
  searchMatch: boolean;
}

interface DustParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  speedX: number;
  speedY: number;
}

type CosmicTheme = "dark" | "paper";
type ViewMode = "orbital" | "radar" | "reward";

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
    glowColor: "rgba(0, 82, 255, 0.4)",
    ringColor: "rgba(0, 82, 255, 0.24)",
    faintRingColor: "rgba(0, 82, 255, 0.08)",
    badgeBg: "rgba(0, 82, 255, 0.1)",
    badgeBorder: "rgba(0, 82, 255, 0.35)",
  },
  degen: {
    name: "Degen",
    shortName: "DEGEN",
    color: "#A855F7",
    brightColor: "#C084FC",
    glowColor: "rgba(168, 85, 247, 0.4)",
    ringColor: "rgba(168, 85, 247, 0.24)",
    faintRingColor: "rgba(168, 85, 247, 0.08)",
    badgeBg: "rgba(168, 85, 247, 0.1)",
    badgeBorder: "rgba(168, 85, 247, 0.35)",
  },
  arbitrum: {
    name: "Arbitrum",
    shortName: "ARBITRUM",
    color: "#12AAFF",
    brightColor: "#38BDF8",
    glowColor: "rgba(18, 170, 255, 0.4)",
    ringColor: "rgba(18, 170, 255, 0.24)",
    faintRingColor: "rgba(18, 170, 255, 0.08)",
    badgeBg: "rgba(18, 170, 255, 0.1)",
    badgeBorder: "rgba(18, 170, 255, 0.35)",
  },
  mainnet: {
    name: "Ethereum",
    shortName: "MAINNET",
    color: "#627EEA",
    brightColor: "#818CF8",
    glowColor: "rgba(98, 126, 234, 0.4)",
    ringColor: "rgba(98, 126, 234, 0.24)",
    faintRingColor: "rgba(98, 126, 234, 0.08)",
    badgeBg: "rgba(98, 126, 234, 0.1)",
    badgeBorder: "rgba(98, 126, 234, 0.35)",
  },
};

function drawRoundedRect(
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

  // Interaction states
  const [hoveredNode, setHoveredNode] = useState<{ node: Node; screenX: number; screenY: number } | null>(null);
  const [hoveredHub, setHoveredHub] = useState<ChainSlug | null>(null);
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
  const [inspectBreakdownBounty, setInspectBreakdownBounty] = useState<Bounty | null>(null);

  // View & Filter states
  const [activeChain, setActiveChain] = useState<ChainSlug | "all">("all");
  const [theme, setTheme] = useState<CosmicTheme>("paper");
  const [viewMode, setViewMode] = useState<ViewMode>("orbital");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [onlyHot, setOnlyHot] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  // Canvas Pan & Zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const hasDraggedRef = useRef(false);

  // Refs for animation loop
  const nodesRef = useRef<Node[]>([]);
  const dustRef = useRef<DustParticle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const logosRef = useRef<Record<string, HTMLImageElement>>({});
  const radarSweepAngleRef = useRef(0);

  // Filtered bounties list
  const filteredBounties = useMemo(() => {
    return bounties.filter((b) => {
      if (activeChain !== "all" && b.chain !== activeChain) return false;
      if (onlyOpen && b.status !== "open") return false;
      if (onlyHot && b.radarScore < 80) return false;
      return true;
    });
  }, [bounties, activeChain, onlyOpen, onlyHot]);

  // Chain counts based on current status filter
  const chainCounts = useMemo(() => {
    const counts: Record<ChainSlug, number> = { base: 0, degen: 0, arbitrum: 0, mainnet: 0 };
    for (const b of bounties) {
      if (counts[b.chain] !== undefined) {
        if ((!onlyOpen || b.status === "open") && (!onlyHot || b.radarScore >= 80)) {
          counts[b.chain]++;
        }
      }
    }
    return counts;
  }, [bounties, onlyOpen, onlyHot]);

  // Aggregate stats in view
  const statsInView = useMemo(() => {
    let totalScore = 0;
    let maxScore = 0;
    let ethSum = 0;
    let degenSum = 0;

    for (const b of filteredBounties) {
      totalScore += b.radarScore;
      if (b.radarScore > maxScore) maxScore = b.radarScore;
      if (b.currency.toUpperCase() === "DEGEN") {
        degenSum += b.amountNumber || 0;
      } else {
        ethSum += b.amountNumber || 0;
      }
    }

    const avgScore = filteredBounties.length ? Math.round(totalScore / filteredBounties.length) : 0;
    return {
      count: filteredBounties.length,
      maxScore,
      avgScore,
      ethSum: ethSum.toFixed(2),
      degenSum: degenSum >= 1_000_000 ? `${(degenSum / 1_000_000).toFixed(1)}M` : degenSum >= 1_000 ? `${(degenSum / 1_000).toFixed(0)}k` : degenSum.toFixed(0),
    };
  }, [filteredBounties]);

  // Preload logos
  useEffect(() => {
    const images: Record<string, HTMLImageElement> = {};

    const baseImg = new Image();
    baseImg.src = `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 115 115">
        <circle cx="57.5" cy="57.5" r="57.5" fill="#0052FF"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M57.5 98C80.4198 98 99 79.4198 99 56.5C99 33.5802 80.4198 15 57.5 15C35.0863 15 16.7869 32.7483 16.0234 54.9474H70.7632V58.0526H16.0234C16.7869 80.2517 35.0863 98 57.5 98Z" fill="white"/>
      </svg>
    `)}`;
    images.base = baseImg;

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

    const arbImg = new Image();
    arbImg.src = "/chains/arbitrum.png";
    images.arbitrum = arbImg;

    const degenImg = new Image();
    degenImg.src = "/chains/degen.png";
    images.degen = degenImg;

    logosRef.current = images;
  }, []);

  // Initialize stellar dust particles
  useEffect(() => {
    const dust: DustParticle[] = [];
    for (let i = 0; i < 45; i++) {
      dust.push({
        x: (Math.random() - 0.5) * 1200,
        y: (Math.random() - 0.5) * 800,
        size: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.4 + 0.15,
        speedX: (Math.random() - 0.5) * 0.15,
        speedY: (Math.random() - 0.5) * 0.15,
      });
    }
    dustRef.current = dust;
  }, []);

  // Compute adaptive Hub Centers based on canvas dimensions and active chain
  const getHubCenters = useCallback(
    (width: number, height: number, chainFilter: ChainSlug | "all") => {
      if (chainFilter !== "all") {
        return {
          base: { x: 0, y: 0 },
          degen: { x: 0, y: 0 },
          arbitrum: { x: 0, y: 0 },
          mainnet: { x: 0, y: 0 },
        };
      }

      // Responsive quad cluster layout with safe boundary margins
      const spanX = Math.min(260, Math.max(160, width * 0.25));
      const spanY = Math.min(150, Math.max(100, height * 0.22));

      return {
        base: { x: -spanX, y: -spanY },
        degen: { x: spanX, y: -spanY * 0.9 },
        arbitrum: { x: -spanX * 0.85, y: spanY * 0.95 },
        mainnet: { x: spanX * 0.85, y: spanY },
      };
    },
    []
  );

  // Initialize / Recompute Nodes whenever filters, bounties or search change
  useEffect(() => {
    if (!bounties || bounties.length === 0) return;

    const canvas = canvasRef.current;
    const width = canvas ? canvas.parentElement?.clientWidth || 800 : 800;
    const height = canvas ? canvas.parentElement?.clientHeight || 500 : 500;
    const hubs = getHubCenters(width, height, activeChain);

    const isSingleChain = activeChain !== "all";
    const sample = filteredBounties.slice(0, 240);
    const qLower = searchQuery.trim().toLowerCase();

    const newNodes: Node[] = sample.map((b, idx) => {
      const hub = hubs[b.chain] || { x: 0, y: 0 };
      const visual = CHAIN_VISUALS[b.chain] || CHAIN_VISUALS.base;

      // Base radius scaled by reward magnitude & radar score
      let radius = 4.0;
      if (b.radarBreakdown?.rewardMagnitude) {
        radius = Math.max(3.2, Math.min(9.5, (b.radarBreakdown.rewardMagnitude / 35) * 6.5 + 3.2));
      } else if (b.radarScore) {
        radius = Math.max(3.2, Math.min(9.5, (b.radarScore / 100) * 6 + 3.2));
      }

      // Calculate orbital distance and layout based on viewMode
      let orbitRadius = 45;
      let orbitSpeed = (0.0003 + (idx % 5) * 0.00012) * (idx % 2 === 0 ? 1 : -1);

      if (viewMode === "orbital") {
        const shellCount = isSingleChain ? 18 : 10;
        const shellSpacing = isSingleChain ? 16 : 11;
        orbitRadius = (isSingleChain ? 55 : 38) + (idx % shellCount) * shellSpacing + ((idx * 7) % 15);
      } else if (viewMode === "radar") {
        // High radar score closer to center or radiating outwards
        const distanceRatio = (100 - b.radarScore) / 100;
        orbitRadius = (isSingleChain ? 50 : 35) + distanceRatio * (isSingleChain ? 280 : 140);
      } else if (viewMode === "reward") {
        // Reward magnitude scale
        const mag = b.radarBreakdown?.rewardMagnitude || 10;
        orbitRadius = (isSingleChain ? 50 : 35) + (mag / 35) * (isSingleChain ? 280 : 140);
      }

      const orbitAngle = ((idx * 137.5) % 360) * (Math.PI / 180); // Golden angle distribution
      const isSearchMatch =
        qLower.length > 0 &&
        (b.title.toLowerCase().includes(qLower) ||
          b.description?.toLowerCase().includes(qLower) ||
          b.standoutTags?.some((t) => t.toLowerCase().includes(qLower)) ||
          b.chain.toLowerCase().includes(qLower));

      return {
        bounty: b,
        chain: b.chain,
        hubX: hub.x,
        hubY: hub.y,
        orbitRadius,
        orbitAngle,
        orbitSpeed,
        x: hub.x + Math.cos(orbitAngle) * orbitRadius,
        y: hub.y + Math.sin(orbitAngle) * orbitRadius,
        radius,
        color: visual.color,
        brightColor: visual.brightColor,
        glowColor: visual.glowColor,
        isHighRadar: b.radarScore >= 80,
        radarScore: b.radarScore,
        amountNumber: b.amountNumber || 0,
        searchMatch: qLower.length === 0 || isSearchMatch,
      };
    });

    nodesRef.current = newNodes;
  }, [bounties, filteredBounties, activeChain, viewMode, searchQuery, getHubCenters]);

  // Main Canvas Render Loop (60fps with HiDPI support)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let displayWidth = canvas.parentElement?.clientWidth || 800;
    let displayHeight = isFullscreen
      ? window.innerHeight - 80
      : Math.min(580, Math.max(420, displayWidth * 0.5));
    let dpr = window.devicePixelRatio || 1;

    const setupCanvasSize = () => {
      if (!canvas || !canvas.parentElement) return;
      displayWidth = canvas.parentElement.clientWidth;
      displayHeight = isFullscreen
        ? window.innerHeight - 80
        : Math.min(580, Math.max(420, displayWidth * 0.5));
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

      const isDark = theme === "dark";

      // 1. Background Fill
      if (isDark) {
        ctx.fillStyle = "#0A0D14";
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        // Subtle Deep Nebula radial glow
        const bgGrad = ctx.createRadialGradient(
          displayWidth / 2,
          displayHeight / 2,
          50,
          displayWidth / 2,
          displayHeight / 2,
          displayWidth * 0.7
        );
        bgGrad.addColorStop(0, "rgba(20, 30, 55, 0.45)");
        bgGrad.addColorStop(0.5, "rgba(10, 15, 28, 0.7)");
        bgGrad.addColorStop(1, "#0A0D14");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, displayWidth, displayHeight);
      } else {
        ctx.fillStyle = "#FAF9F5";
        ctx.fillRect(0, 0, displayWidth, displayHeight);

        // Architectural millimeter cartography grid
        ctx.strokeStyle = "rgba(229, 228, 223, 0.55)";
        ctx.lineWidth = 0.5;
        const gridSize = 40;
        ctx.beginPath();
        for (let x = 0; x < displayWidth; x += gridSize) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, displayHeight);
        }
        for (let y = 0; y < displayHeight; y += gridSize) {
          ctx.moveTo(0, y);
          ctx.lineTo(displayWidth, y);
        }
        ctx.stroke();
      }

      const cx = displayWidth / 2 + pan.x;
      const cy = displayHeight / 2 + pan.y;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);

      // 2. Draw Subtle Ambient Dust Particles
      for (const d of dustRef.current) {
        if (!isPaused) {
          d.x += d.speedX * speedMultiplier;
          d.y += d.speedY * speedMultiplier;
          if (d.x > 700) d.x = -700;
          if (d.x < -700) d.x = 700;
          if (d.y > 500) d.y = -500;
          if (d.y < -500) d.y = 500;
        }

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? `rgba(180, 210, 255, ${d.alpha * 0.8})` : `rgba(217, 119, 87, ${d.alpha * 0.4})`;
        ctx.fill();
      }

      // 3. Central Radar Polar Coordinates (Faint rings & azimuth axes)
      ctx.save();
      ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(20, 20, 19, 0.04)";
      ctx.lineWidth = 1;

      // Coordinate Crosshairs
      ctx.beginPath();
      ctx.moveTo(-displayWidth, 0);
      ctx.lineTo(displayWidth, 0);
      ctx.moveTo(0, -displayHeight);
      ctx.lineTo(0, displayHeight);
      ctx.stroke();

      // Concentric Radar Distance Rings
      [100, 220, 360, 500].forEach((r) => {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();

      // 4. Rotating Radar Sweep Beam
      if (!isPaused) {
        radarSweepAngleRef.current = (radarSweepAngleRef.current + 0.008 * speedMultiplier) % (Math.PI * 2);
      }
      const sweepAngle = radarSweepAngleRef.current;

      ctx.save();
      const sweepGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 480);
      sweepGrad.addColorStop(0, isDark ? "rgba(0, 220, 255, 0.12)" : "rgba(217, 119, 87, 0.08)");
      sweepGrad.addColorStop(1, "transparent");

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 480, sweepAngle - 0.25, sweepAngle);
      ctx.closePath();
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      // Sweep leading laser line
      ctx.strokeStyle = isDark ? "rgba(0, 220, 255, 0.28)" : "rgba(217, 119, 87, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(sweepAngle) * 480, Math.sin(sweepAngle) * 480);
      ctx.stroke();
      ctx.restore();

      // 5. Hub Positions
      const isSingleChain = activeChain !== "all";
      const hubs = getHubCenters(displayWidth, displayHeight, activeChain);

      const chainHubList: { slug: ChainSlug; x: number; y: number }[] = isSingleChain
        ? [{ slug: activeChain as ChainSlug, x: 0, y: 0 }]
        : [
            { slug: "base", x: hubs.base.x, y: hubs.base.y },
            { slug: "degen", x: hubs.degen.x, y: hubs.degen.y },
            { slug: "arbitrum", x: hubs.arbitrum.x, y: hubs.arbitrum.y },
            { slug: "mainnet", x: hubs.mainnet.x, y: hubs.mainnet.y },
          ];

      // 6. Draw Chain Hubs, Planetary Glows, Rings & Logos
      chainHubList.forEach((hub, idx) => {
        const visual = CHAIN_VISUALS[hub.slug];
        if (!visual) return;

        const hubRadius = isSingleChain ? 24 : 20;
        const pulse = Math.sin(elapsed * 0.003 + idx * 1.5) * 2.5;

        // Outer Aura Halo
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, hubRadius + 10 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = isDark
          ? visual.glowColor.replace("0.4", "0.22")
          : visual.glowColor.replace("0.4", "0.15");
        ctx.fill();

        // Orbital System Rings
        const ringRadii = isSingleChain ? [75, 140, 205, 270, 335] : [65, 120, 175];
        ringRadii.forEach((r, rIdx) => {
          ctx.strokeStyle = isDark
            ? rIdx === 0
              ? visual.ringColor.replace("0.24", "0.4")
              : visual.faintRingColor.replace("0.08", "0.16")
            : rIdx === 0
            ? visual.ringColor
            : visual.faintRingColor;
          ctx.lineWidth = rIdx === 0 ? 1.4 : 0.8;
          if (rIdx === 0) {
            ctx.setLineDash([4, 4]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.beginPath();
          ctx.arc(hub.x, hub.y, r, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.setLineDash([]);

        // Hub Disc Base
        ctx.save();
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, hubRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? "#121722" : "#FFFFFF";
        ctx.shadowColor = isDark ? visual.color : "rgba(0, 0, 0, 0.12)";
        ctx.shadowBlur = isDark ? 12 : 8;
        ctx.shadowOffsetY = 2;
        ctx.fill();

        // Clip and Draw Official Network Logo
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
          ctx.fillStyle = visual.color;
          ctx.fill();
          ctx.font = `bold ${isSingleChain ? "13px" : "11px"} monospace`;
          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(visual.name[0], hub.x, hub.y);
        }
        ctx.restore();

        // Hub Crisp Outer Ring
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, hubRadius, 0, Math.PI * 2);
        ctx.strokeStyle = visual.color;
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Chain Name & Count Pill below the hub
        const labelY = hub.y + hubRadius + 15;
        const count = chainCounts[hub.slug] || 0;
        const labelText = visual.shortName;
        const countText = `${count}`;

        ctx.font = "bold 9px monospace";
        const textWidth = ctx.measureText(labelText).width;
        ctx.font = "8px monospace";
        const countWidth = ctx.measureText(countText).width;
        const pillWidth = textWidth + countWidth + 18;
        const pillHeight = 18;
        const pillX = hub.x - pillWidth / 2;
        const pillY = labelY - 9;

        // Rounded pill background
        ctx.fillStyle = isDark ? "rgba(18, 23, 34, 0.9)" : visual.badgeBg;
        ctx.strokeStyle = isDark ? visual.ringColor : visual.badgeBorder;
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, pillX, pillY, pillWidth, pillHeight, 5);
        ctx.fill();
        ctx.stroke();

        // Badge Text
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = "bold 9px monospace";
        ctx.fillStyle = visual.color;
        ctx.fillText(labelText, pillX + 6, labelY);

        ctx.font = "8px monospace";
        ctx.fillStyle = isDark ? "#94A3B8" : "#6B6B67";
        ctx.fillText(countText, pillX + textWidth + 9, labelY);
      });

      // 7. Draw Constellation Star Gravitational Web (Connecting high-radar nodes)
      const currentNodes = nodesRef.current;
      ctx.save();
      for (let i = 0; i < currentNodes.length; i++) {
        const a = currentNodes[i];
        if (a.radarScore < 75 || !a.searchMatch) continue;

        for (let j = i + 1; j < currentNodes.length; j++) {
          const b = currentNodes[j];
          if (b.chain !== a.chain || b.radarScore < 75 || !b.searchMatch) continue;

          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 65) {
            const alpha = (1 - dist / 65) * 0.28;
            ctx.strokeStyle = isDark ? a.brightColor : a.color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // 8. Draw Orbiting Star Nodes
      for (const node of currentNodes) {
        if (!isPaused) {
          node.orbitAngle += node.orbitSpeed * speedMultiplier;
          node.x = node.hubX + Math.cos(node.orbitAngle) * node.orbitRadius;
          node.y = node.hubY + Math.sin(node.orbitAngle) * node.orbitRadius;
        }

        const isHovered =
          hoveredNode?.node.bounty.id === node.bounty.id &&
          hoveredNode?.node.bounty.chain === node.bounty.chain;

        // Alpha calculation based on search query matching
        const matchAlpha = node.searchMatch ? 1 : isDark ? 0.12 : 0.18;

        // Hovered Laser Guide from node to its chain hub
        if (isHovered) {
          ctx.save();
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 1.4;
          ctx.setLineDash([4, 4]);
          ctx.globalAlpha = 0.75;
          ctx.beginPath();
          ctx.moveTo(node.hubX, node.hubY);
          ctx.lineTo(node.x, node.y);
          ctx.stroke();
          ctx.restore();
        }

        // High Radar (80+) Glowing Solar Aura
        if (node.isHighRadar && node.searchMatch) {
          const haloPulse = Math.sin(elapsed * 0.005 + node.orbitAngle * 2) * 2;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 4 + haloPulse, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? node.glowColor : "rgba(217, 119, 87, 0.25)";
          ctx.globalAlpha = matchAlpha * (isDark ? 0.8 : 0.6);
          ctx.fill();
        }

        // Hover Target Reticle Ring
        if (isHovered) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 5.5, 0, Math.PI * 2);
          ctx.strokeStyle = isDark ? "#38BDF8" : node.color;
          ctx.lineWidth = 1.6;
          ctx.stroke();

          // Target reticle tick marks
          const rTick = node.radius + 7.5;
          ctx.beginPath();
          ctx.moveTo(node.x - rTick, node.y);
          ctx.lineTo(node.x - rTick - 3, node.y);
          ctx.moveTo(node.x + rTick, node.y);
          ctx.lineTo(node.x + rTick + 3, node.y);
          ctx.moveTo(node.x, node.y - rTick);
          ctx.lineTo(node.x, node.y - rTick - 3);
          ctx.moveTo(node.x, node.y + rTick);
          ctx.lineTo(node.x, node.y + rTick + 3);
          ctx.stroke();
          ctx.restore();
        }

        // Main Star Dot Body
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = isDark && node.isHighRadar ? node.brightColor : node.color;
        ctx.globalAlpha = matchAlpha;
        ctx.fill();

        // Crisp White Border
        ctx.strokeStyle = isDark
          ? node.isHighRadar
            ? "#FFFFFF"
            : "rgba(255, 255, 255, 0.75)"
          : node.isHighRadar
          ? "#FFFFFF"
          : "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = node.isHighRadar ? 1.5 : 1;
        ctx.stroke();

        // Inner Shimmering Star Spark
        if (node.isHighRadar && node.searchMatch) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, Math.max(1.2, node.radius * 0.35), 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.globalAlpha = matchAlpha;
          ctx.fill();
        }
      }

      ctx.restore(); // restore zoom, pan & translate
      ctx.restore(); // restore dpr

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", setupCanvasSize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    zoom,
    pan,
    activeChain,
    theme,
    viewMode,
    isPaused,
    speedMultiplier,
    chainCounts,
    hoveredNode,
    isFullscreen,
    getHubCenters,
  ]);

  // Mouse & Touch Interactivity (Pan, Click, Hover)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDraggedRef.current = true;
      }
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2 - pan.x;
    const y = e.clientY - rect.top - rect.height / 2 - pan.y;

    const scaledX = x / zoom;
    const scaledY = y / zoom;

    // Check hit on bounty nodes
    let hitNode: Node | null = null;
    for (const node of nodesRef.current) {
      const dist = Math.hypot(node.x - scaledX, node.y - scaledY);
      if (dist <= node.radius + 6) {
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
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    const hubs = getHubCenters(displayWidth, displayHeight, activeChain);

    const isSingleChain = activeChain !== "all";
    const hubList: { slug: ChainSlug; x: number; y: number }[] = isSingleChain
      ? [{ slug: activeChain as ChainSlug, x: 0, y: 0 }]
      : [
          { slug: "base", x: hubs.base.x, y: hubs.base.y },
          { slug: "degen", x: hubs.degen.x, y: hubs.degen.y },
          { slug: "arbitrum", x: hubs.arbitrum.x, y: hubs.arbitrum.y },
          { slug: "mainnet", x: hubs.mainnet.x, y: hubs.mainnet.y },
        ];

    let hitHub: ChainSlug | null = null;
    for (const hub of hubList) {
      const dist = Math.hypot(hub.x - scaledX, hub.y - scaledY);
      if (dist <= 26) {
        hitHub = hub.slug;
        break;
      }
    }
    setHoveredHub(hitHub);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleClick = () => {
    if (hasDraggedRef.current) return;

    if (hoveredNode) {
      setSelectedBounty(hoveredNode.node.bounty);
    } else if (hoveredHub) {
      setActiveChain(hoveredHub);
      setPan({ x: 0, y: 0 });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setZoom((z) => Math.min(2.8, Math.max(0.5, z * zoomFactor)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl border transition-all duration-300 overflow-hidden shadow-paper ${
        theme === "dark"
          ? "border-[#1E293B] bg-[#0A0D14] text-white"
          : "border-[#E5E4DF] bg-[#FFFFFF] text-[#141413]"
      } ${isFullscreen ? "fixed inset-0 z-50 rounded-none border-none" : ""}`}
    >
      {/* 1. Header Toolbar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b transition-colors ${
          theme === "dark"
            ? "border-[#1E293B] bg-[#0F1420]/90 backdrop-blur-md"
            : "border-[#E5E4DF] bg-[#FAF9F5]"
        }`}
      >
        {/* Title & Section Tagline */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
              theme === "dark"
                ? "bg-[#161F30] border-[#2A374F] text-[#38BDF8]"
                : "bg-[#F0EEE6] border-[#E5E4DF] text-[#D97757]"
            }`}
          >
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base tracking-tight">
                Bounty Constellation
              </h3>
              <span
                className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                  theme === "dark"
                    ? "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20"
                    : "bg-[#D97757]/10 text-[#D97757] border-[#D97757]/20"
                }`}
              >
                Live Galaxy
              </span>
            </div>
            <p
              className={`text-xs ${
                theme === "dark" ? "text-[#94A3B8]" : "text-[#6B6B67]"
              }`}
            >
              Multi-chain orbital map • Sized by reward magnitude, color-coded by network
            </p>
          </div>
        </div>

        {/* Search Bar in Galaxy */}
        <div className="flex-1 max-w-xs min-w-[180px] relative">
          <Search
            className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${
              theme === "dark" ? "text-[#64748B]" : "text-[#8E8E8A]"
            }`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search constellation..."
            className={`w-full text-xs font-mono pl-8 pr-7 py-1.5 rounded-lg border outline-none transition-all ${
              theme === "dark"
                ? "bg-[#161F30] border-[#2A374F] text-white placeholder-[#64748B] focus:border-[#38BDF8]"
                : "bg-[#FFFFFF] border-[#E5E4DF] text-[#141413] placeholder-[#8E8E8A] focus:border-[#D97757]"
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#8E8E8A] hover:text-[#141413]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Toggles: Theme, Speed, Fullscreen */}
        <div className="flex items-center gap-1.5">
          {/* View Mode Switcher */}
          <div
            className={`hidden md:flex items-center p-0.5 rounded-lg border text-xs font-mono ${
              theme === "dark" ? "bg-[#161F30] border-[#2A374F]" : "bg-[#F0EEE6] border-[#E5E4DF]"
            }`}
          >
            <button
              onClick={() => setViewMode("orbital")}
              className={`px-2 py-1 rounded transition-colors ${
                viewMode === "orbital"
                  ? theme === "dark"
                    ? "bg-[#22304A] text-white font-bold"
                    : "bg-[#FFFFFF] text-[#141413] font-bold shadow-sm"
                  : "text-[#8E8E8A] hover:text-[#141413]"
              }`}
              title="Orbital cluster layout"
            >
              Orbit
            </button>
            <button
              onClick={() => setViewMode("radar")}
              className={`px-2 py-1 rounded transition-colors ${
                viewMode === "radar"
                  ? theme === "dark"
                    ? "bg-[#22304A] text-white font-bold"
                    : "bg-[#FFFFFF] text-[#141413] font-bold shadow-sm"
                  : "text-[#8E8E8A] hover:text-[#141413]"
              }`}
              title="Distance by Radar Score"
            >
              Radar
            </button>
            <button
              onClick={() => setViewMode("reward")}
              className={`px-2 py-1 rounded transition-colors ${
                viewMode === "reward"
                  ? theme === "dark"
                    ? "bg-[#22304A] text-white font-bold"
                    : "bg-[#FFFFFF] text-[#141413] font-bold shadow-sm"
                  : "text-[#8E8E8A] hover:text-[#141413]"
              }`}
              title="Distance by Reward Size"
            >
              Scale
            </button>
          </div>

          {/* Theme Switcher: Observatory Cosmic vs Warm Paper */}
          <button
            onClick={() => setTheme((t) => (t === "dark" ? "paper" : "dark"))}
            className={`text-xs font-mono px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
              theme === "dark"
                ? "bg-[#161F30] border-[#2A374F] text-[#38BDF8] hover:bg-[#1E2B42]"
                : "bg-[#FFFFFF] border-[#E5E4DF] text-[#6B6B67] hover:text-[#141413] hover:bg-[#F0EEE6]"
            }`}
            title="Toggle Cosmic Observatory / Cartography Paper view"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{theme === "dark" ? "Observatory" : "Paper Map"}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-1.5 rounded-lg border transition-colors ${
              theme === "dark"
                ? "bg-[#161F30] border-[#2A374F] text-[#94A3B8] hover:text-white"
                : "bg-[#FFFFFF] border-[#E5E4DF] text-[#6B6B67] hover:text-[#141413]"
            }`}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Galaxy"}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Chain Filters & Quick Filter Chips Bar */}
      <div
        className={`flex items-center justify-between gap-3 px-5 py-2 border-b overflow-x-auto ${
          theme === "dark" ? "border-[#1E293B] bg-[#0A0D14]/80" : "border-[#E5E4DF] bg-[#FAF9F5]/80"
        }`}
      >
        <div className="flex items-center gap-1.5 flex-nowrap">
          <button
            onClick={() => {
              setActiveChain("all");
              setPan({ x: 0, y: 0 });
            }}
            className={`text-xs font-mono px-2.5 py-1 rounded-md border transition-all whitespace-nowrap ${
              activeChain === "all"
                ? theme === "dark"
                  ? "bg-[#1E293B] text-white font-bold border-[#38BDF8]"
                  : "bg-[#FFFFFF] text-[#141413] font-bold border-[#D1D0C9] shadow-sm ring-1 ring-[#141413]/10"
                : theme === "dark"
                ? "bg-transparent text-[#94A3B8] border-transparent hover:text-white"
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
                onClick={() => {
                  setActiveChain(c);
                  setPan({ x: 0, y: 0 });
                }}
                className={`text-xs font-mono px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? theme === "dark"
                      ? "bg-[#1E293B] text-white font-bold shadow-sm ring-1"
                      : "bg-[#FFFFFF] text-[#141413] font-bold border-[#D1D0C9] shadow-sm ring-1"
                    : theme === "dark"
                    ? "bg-transparent text-[#94A3B8] border-transparent hover:text-white hover:bg-[#161F30]"
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
        </div>

        {/* Filter Badges: Open Only, Hot (80+) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setOnlyOpen(!onlyOpen)}
            className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
              onlyOpen
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 font-bold"
                : theme === "dark"
                ? "bg-[#161F30] text-[#94A3B8] border-[#2A374F] hover:text-white"
                : "bg-[#FFFFFF] text-[#6B6B67] border-[#E5E4DF] hover:text-[#141413]"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Open Only</span>
          </button>

          <button
            onClick={() => setOnlyHot(!onlyHot)}
            className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
              onlyHot
                ? "bg-[#D97757]/15 text-[#D97757] border-[#D97757]/40 font-bold"
                : theme === "dark"
                ? "bg-[#161F30] text-[#94A3B8] border-[#2A374F] hover:text-white"
                : "bg-[#FFFFFF] text-[#6B6B67] border-[#E5E4DF] hover:text-[#141413]"
            }`}
          >
            <Flame className="w-3 h-3 fill-[#D97757] text-[#D97757]" />
            <span>Hot 80+</span>
          </button>
        </div>
      </div>

      {/* 3. Interactive Canvas Area */}
      <div
        className={`relative w-full select-none ${
          isFullscreen ? "h-[calc(100vh-140px)]" : "h-[440px] sm:h-[520px]"
        } ${hoveredHub ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onMouseLeave={() => {
            isDraggingRef.current = false;
            setHoveredNode(null);
            setHoveredHub(null);
          }}
          onClick={handleClick}
          className="w-full h-full block"
        />

        {/* Top-Right HUD Navigation Controls */}
        <div
          className={`absolute top-3 right-3 p-1.5 rounded-lg border backdrop-blur-md flex items-center gap-1 shadow-md ${
            theme === "dark"
              ? "bg-[#0F1420]/90 border-[#2A374F] text-[#94A3B8]"
              : "bg-[#FFFFFF]/95 border-[#E5E4DF] text-[#6B6B67]"
          }`}
        >
          <button
            onClick={() => setZoom((z) => Math.min(2.8, z + 0.25))}
            className="p-1.5 hover:text-[#141413] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 rounded transition-colors"
            title="Zoom in (+)"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-1.5 hover:text-[#141413] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 rounded transition-colors"
            title="Zoom out (-)"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 hover:text-[#141413] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 rounded transition-colors"
            title="Reset position & zoom"
            aria-label="Reset galaxy view"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3.5 bg-black/10 dark:bg-white/15 mx-0.5" />
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 hover:text-[#141413] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 rounded transition-colors"
            title={isPaused ? "Resume orbits" : "Pause orbits"}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setSpeedMultiplier((s) => (s === 1 ? 2 : s === 2 ? 0.5 : 1))}
            className="px-1.5 py-0.5 text-[10px] font-mono hover:text-[#141413] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors font-bold"
            title="Orbit Speed"
          >
            {speedMultiplier}x
          </button>
        </div>

        {/* Top-Left Telemetry Metrics HUD */}
        <div
          className={`absolute top-3 left-3 p-2.5 rounded-lg border backdrop-blur-md hidden sm:flex items-center gap-4 text-xs font-mono shadow-sm pointer-events-none ${
            theme === "dark"
              ? "bg-[#0F1420]/85 border-[#2A374F] text-[#94A3B8]"
              : "bg-[#FFFFFF]/90 border-[#E5E4DF] text-[#6B6B67]"
          }`}
        >
          <div>
            <span className="text-[9px] uppercase tracking-wider block opacity-70">
              Stars in View
            </span>
            <span className="font-bold text-[#141413] dark:text-white">
              {statsInView.count}
            </span>
          </div>
          <div className="w-px h-6 bg-black/10 dark:bg-white/15" />
          <div>
            <span className="text-[9px] uppercase tracking-wider block opacity-70">
              Peak Radar
            </span>
            <span className="font-bold text-[#D97757]">
              {statsInView.maxScore}
            </span>
          </div>
          <div className="w-px h-6 bg-black/10 dark:bg-white/15" />
          <div>
            <span className="text-[9px] uppercase tracking-wider block opacity-70">
              Pool in View
            </span>
            <span className="font-bold text-[#141413] dark:text-white">
              {statsInView.ethSum} ETH {statsInView.degenSum !== "0" ? `+ ${statsInView.degenSum} DEGEN` : ""}
            </span>
          </div>
        </div>

        {/* Bottom Legend Bar (Sleek non-overlapping floating strip) */}
        <div
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full border backdrop-blur-md flex flex-wrap items-center gap-3.5 text-[11px] font-mono shadow-md ${
            theme === "dark"
              ? "bg-[#0F1420]/95 border-[#2A374F] text-[#94A3B8]"
              : "bg-[#FFFFFF]/95 border-[#E5E4DF] text-[#6B6B67]"
          }`}
        >
          <span className="text-[10px] text-[#8E8E8A] uppercase tracking-wider font-semibold">
            Networks:
          </span>
          {CHAIN_ORDER.map((c) => {
            const visual = CHAIN_VISUALS[c];
            return (
              <div key={c} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/60 shadow-sm flex-shrink-0"
                  style={{ backgroundColor: visual.color }}
                />
                <span className="font-medium text-[#141413] dark:text-slate-200">
                  {visual.name}
                </span>
              </div>
            );
          })}
          <div className="w-px h-3 bg-black/15 dark:bg-white/20 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D97757] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D97757]"></span>
            </span>
            <span className="text-[#D97757] font-semibold">Radar 80+ Solar Flare</span>
          </div>
        </div>
      </div>

      {/* 4. Floating Hover Tooltip */}
      {hoveredNode && !selectedBounty && (
        <div
          className={`fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 p-3 rounded-xl border shadow-xl w-64 space-y-2 animate-in fade-in zoom-in-95 duration-100 ${
            theme === "dark"
              ? "bg-[#0F1420] border-[#2A374F] text-white"
              : "bg-[#FFFFFF] border-[#E5E4DF] text-[#141413]"
          }`}
          style={{
            left: `${hoveredNode.screenX}px`,
            top: `${hoveredNode.screenY - 12}px`,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <ChainBadge chain={hoveredNode.node.bounty.chain} size="sm" />
            <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#D97757]">
              <Flame className="w-3.5 h-3.5 fill-[#D97757]" />
              <span>{hoveredNode.node.bounty.radarScore}</span>
            </div>
          </div>
          <div className="text-xs font-bold line-clamp-2">
            {hoveredNode.node.bounty.title}
          </div>
          <div className="flex items-center justify-between text-xs font-mono pt-1.5 border-t border-black/10 dark:border-white/10">
            <span className="text-[#8E8E8A]">Reward:</span>
            <span className="font-bold text-[#141413] dark:text-white">
              {formatReward(hoveredNode.node.bounty.amountWei, hoveredNode.node.bounty.currency).fullWithSymbol}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#8E8E8A]">
            <span>Claims: {hoveredNode.node.bounty.claimCount}</span>
            <span className="capitalize">{hoveredNode.node.bounty.status}</span>
          </div>
        </div>
      )}

      {/* 5. Selected Bounty Quick Action Bottom Dock */}
      {selectedBounty && (
        <div
          className={`p-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-bottom duration-150 ${
            theme === "dark"
              ? "border-[#1E293B] bg-[#121826] text-white"
              : "border-[#E5E4DF] bg-[#F0EEE6] text-[#141413]"
          }`}
        >
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <ChainBadge chain={selectedBounty.chain} size="sm" />
              <StatusBadge status={selectedBounty.status} size="sm" />
              <button
                onClick={() => setInspectBreakdownBounty(selectedBounty)}
                className="text-xs font-mono text-[#D97757] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                title="Inspect Radar Score Breakdown"
              >
                <Flame className="w-3 h-3 fill-[#D97757]" />
                <span>Radar {selectedBounty.radarScore}</span>
              </button>
            </div>
            <h4 className="text-sm font-bold line-clamp-1">
              {selectedBounty.title}
            </h4>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase text-[#8E8E8A]">Reward</div>
              <div className="font-mono text-sm font-bold">
                {formatReward(selectedBounty.amountWei, selectedBounty.currency).fullWithSymbol}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedBounty(null)}
                className={`text-xs font-mono px-2.5 py-1.5 rounded-lg border transition-colors ${
                  theme === "dark"
                    ? "border-[#2A374F] bg-[#161F30] text-[#94A3B8] hover:text-white"
                    : "border-[#E5E4DF] bg-[#FFFFFF] text-[#6B6B67] hover:text-[#141413]"
                }`}
              >
                Dismiss
              </button>

              <button
                onClick={() => setInspectBreakdownBounty(selectedBounty)}
                className={`text-xs font-mono px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
                  theme === "dark"
                    ? "border-[#2A374F] bg-[#161F30] text-[#38BDF8] hover:bg-[#202D45]"
                    : "border-[#E5E4DF] bg-[#FFFFFF] text-[#D97757] hover:bg-[#FAF9F5]"
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>Score Breakdown</span>
              </button>

              <Link
                href={`/bounty/${selectedBounty.chain}/${selectedBounty.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-mono font-medium px-3.5 py-1.5 rounded-lg bg-[#D97757] text-white hover:bg-[#CC785C] transition-colors shadow-sm"
              >
                <span>View Bounty</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 6. Score Breakdown Modal */}
      {inspectBreakdownBounty && (
        <ScoreBreakdownModal
          bounty={inspectBreakdownBounty}
          isOpen={!!inspectBreakdownBounty}
          onClose={() => setInspectBreakdownBounty(null)}
        />
      )}
    </div>
  );
}
