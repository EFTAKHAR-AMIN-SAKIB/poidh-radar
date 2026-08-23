"use client";

import React, { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll back to top"
      className={cn(
        "fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 p-2.5 rounded-full border border-[#E5E4DF] bg-[#FAF9F5]/90 hover:bg-[#FFFFFF] text-[#141413] shadow-paper hover:border-[#D97757] hover:text-[#D97757] active:scale-90 backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
      )}
    >
      <ArrowUp className="w-4 h-4" />
    </button>
  );
}
