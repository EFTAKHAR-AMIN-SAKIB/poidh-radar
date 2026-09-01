import type { Metadata } from "next";
import { fetchLiveStats, getAllBounties } from "@/lib/poidh/client";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Navbar } from "@/components/layout/Navbar";
import { LiveSyncProvider } from "@/components/sync/LiveSyncContext";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import "./globals.css";

export const metadata: Metadata = {
  title: "POIDH Radar — Onchain Bounty Discovery Engine",
  description:
    "Discover, filter, and analyze live POIDH bounties across Base, Degen, Arbitrum, and Ethereum Mainnet. An editorial onchain discovery engine.",
  keywords: [
    "POIDH",
    "POIDH Radar",
    "Bounties",
    "Onchain Bounties",
    "Web3",
    "Base",
    "Degen",
    "Arbitrum",
    "Ethereum",
    "Cryptocurrency",
  ],
  authors: [{ name: "POIDH Community" }],
  openGraph: {
    title: "POIDH Radar — Onchain Bounty Discovery Engine",
    description:
      "Visual discovery engine for live POIDH onchain bounties across Base, Degen, Arbitrum, and Ethereum Mainnet.",
    type: "website",
    siteName: "POIDH Radar",
  },
  twitter: {
    card: "summary_large_image",
    title: "POIDH Radar — Onchain Bounty Discovery Engine",
    description:
      "Visual discovery engine for live POIDH onchain bounties.",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [bounties, stats] = await Promise.all([
    getAllBounties(),
    fetchLiveStats(),
  ]);

  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen flex flex-col bg-[#FAF9F5] text-[#141413] antialiased">
        <LiveSyncProvider initialBounties={bounties} initialStats={stats}>
          <Navbar bounties={bounties} />
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
          <Footer />
          <MobileBottomNav bounties={bounties} />
          <ScrollToTop />
        </LiveSyncProvider>
      </body>
    </html>
  );
}
