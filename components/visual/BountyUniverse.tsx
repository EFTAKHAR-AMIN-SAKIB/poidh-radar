"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, Flame, Info, RotateCcw, Sparkles, ZoomIn, ZoomOut } from "lucide-react";
import { CHAINS, CHAIN_ORDER } from "@/lib/poidh/chains";
import { Bounty, ChainSlug } from "@/lib/poidh/types";
import { formatReward } from "@/lib/utils/format";
import { ChainBadge, StatusBadge } from "../ui/Badge";

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
  color: string;
  glowColor: string;
  orbitAngle: number;
  orbitSpeed: number;
  orbitRadius: number;
  centerX: number;
  centerY: number;
}

export function BountyUniverse({ bounties }: BountyUniverseProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{ node: Node; screenX: number; screenY: number } | null>(null);
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
  const [activeChain, setActiveChain] = useState<ChainSlug | "all">("all");
  const [zoom, setZoom] = useState(1);
  const nodesRef = useRef<Node[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Initialize node positions clustered by chain
  useEffect(() => {
    if (!bounties || bounties.length === 0) return;

    const filtered = activeChain === "all" ? bounties : bounties.filter((b) => b.chain === activeChain);
    const sample = filtered.slice(0, 180);

    const chainCenters: Record<ChainSlug, { x: number; y: number; angle: number }> = {
      base: { x: -190, y: -110, angle: 0 },
      degen: { x: 200, y: -90, angle: Math.PI * 0.5 },
      arbitrum: { x: -150, y: 150, angle: Math.PI },
      mainnet: { x: 170, y: 140, angle: Math.PI * 1.5 },
    };

    const newNodes: Node[] = sample.map((b, idx) => {
      const center = chainCenters[b.chain] || { x: 0, y: 0, angle: 0 };

      const baseRadius = b.radarBreakdown?.rewardMagnitude
        ? Math.max(3.5, Math.min(10, (b.radarBreakdown.rewardMagnitude / 30) * 7 + 3))
        : 4.5;

      const orbitRadius = 38 + (idx % 12) * 15 + Math.random() * 18;
      const orbitAngle = Math.random() * Math.PI * 2;
      const orbitSpeed = (0.0004 + Math.random() * 0.0007) * (idx % 2 === 0 ? 1 : -1);

      return {
        bounty: b,
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
        color: b.radarScore >= 80 ? "#D97757" : "#141413",
        glowColor: "#D97757",
      };
    });

    nodesRef.current = newNodes;
  }, [bounties, activeChain]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = Math.min(500, Math.max(380, width * 0.45)));

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = Math.min(500, Math.max(380, width * 0.45));
    };
    window.addEventListener("resize", handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(zoom, zoom);

      // Draw subtle orbital rings
      const chainCenters = [
        { name: "BASE", x: -190, y: -110 },
        { name: "DEGEN", x: 200, y: -90 },
        { name: "ARBITRUM", x: -150, y: 150 },
        { name: "MAINNET", x: 170, y: 140 },
      ];

      for (const center of chainCenters) {
        ctx.strokeStyle = "rgba(229, 228, 223, 0.9)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(center.x, center.y, 65, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(229, 228, 223, 0.5)";
        ctx.beginPath();
        ctx.arc(center.x, center.y, 130, 0, Math.PI * 2);
        ctx.stroke();

        // Hub core
        ctx.fillStyle = "#FAF9F5";
        ctx.beginPath();
        ctx.arc(center.x, center.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#D1D0C9";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        ctx.font = "bold 9px monospace";
        ctx.fillStyle = "#8E8E8A";
        ctx.textAlign = "center";
        ctx.fillText(center.name, center.x, center.y + 20);
      }

      // Draw nodes
      for (const node of nodesRef.current) {
        node.orbitAngle += node.orbitSpeed;
        node.x = node.centerX + Math.cos(node.orbitAngle) * node.orbitRadius;
        node.y = node.centerY + Math.sin(node.orbitAngle) * node.orbitRadius;

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.bounty.radarScore >= 80 ? "#D97757" : "#F0EEE6";
        ctx.fill();
        ctx.strokeStyle = node.bounty.radarScore >= 80 ? "#CC785C" : "#D1D0C9";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [zoom]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - canvas.width / 2;
    const y = e.clientY - rect.top - canvas.height / 2;

    const scaledX = x / zoom;
    const scaledY = y / zoom;

    let hit: Node | null = null;
    for (const node of nodesRef.current) {
      const dist = Math.hypot(node.x - scaledX, node.y - scaledY);
      if (dist <= node.radius + 4) {
        hit = node;
        break;
      }
    }

    if (hit) {
      setHoveredNode({
        node: hit,
        screenX: e.clientX,
        screenY: e.clientY,
      });
    } else {
      setHoveredNode(null);
    }
  };

  const handleClick = () => {
    if (hoveredNode) {
      setSelectedBounty(hoveredNode.node.bounty);
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
              Multi-chain orbital map • Sized by reward, highlighted by Radar Score
            </p>
          </div>
        </div>

        {/* Chain Filters & Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveChain("all")}
            className={`text-xs font-mono px-2.5 py-1 rounded-md border transition-colors ${
              activeChain === "all"
                ? "bg-[#F0EEE6] text-[#141413] font-bold border-[#D1D0C9]"
                : "bg-transparent text-[#6B6B67] border-transparent hover:text-[#141413] hover:bg-[#F0EEE6]/60"
            }`}
          >
            All Clusters
          </button>
          {CHAIN_ORDER.map((c) => {
            const cfg = CHAINS[c];
            const isSelected = activeChain === c;
            return (
              <button
                key={c}
                onClick={() => setActiveChain(c)}
                className={`text-xs font-mono px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1 ${
                  isSelected
                    ? "bg-[#F0EEE6] text-[#141413] font-bold border-[#D1D0C9]"
                    : "bg-transparent text-[#6B6B67] border-transparent hover:text-[#141413] hover:bg-[#F0EEE6]/60"
                }`}
              >
                <span>{cfg.shortName}</span>
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
      <div ref={containerRef} className="relative w-full h-[380px] sm:h-[420px] bg-[#FAF9F5] cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredNode(null)}
          onClick={handleClick}
          className="w-full h-full block"
        />

        {/* Legend */}
        <div className="absolute bottom-3 left-3 p-2 rounded-md border border-[#E5E4DF] bg-[#FFFFFF]/90 backdrop-blur-sm flex items-center gap-3 text-[11px] font-mono text-[#6B6B67]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#141413]" />
            <span>Open Bounty</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#D97757]" />
            <span>High Radar Score</span>
          </div>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredNode && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full mb-3 p-3 rounded-lg border border-[#E5E4DF] bg-[#FFFFFF] shadow-paper-md w-60 space-y-1.5 animate-in fade-in zoom-in-95 duration-100"
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
                className="inline-flex items-center gap-1 text-xs font-mono font-medium px-3.5 py-1.5 rounded bg-[#D97757] text-white hover:bg-[#CC785C] transition-colors"
              >
                <span>View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
