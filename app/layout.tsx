import type { Metadata } from "next";
import { getAllBounties } from "@/lib/poidh/client";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
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
  const bounties = await getAllBounties();

  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen flex flex-col bg-[#FAF9F5] text-[#141413] antialiased">
        <Navbar bounties={bounties} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
