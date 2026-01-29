/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useState } from "react";

const SOCIALS = [
  {
    href: "https://github.com/grmkris",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
    label: "GitHub",
  },
  {
    href: "https://x.com/_krisgg",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    label: "X",
  },
  {
    href: "https://linkedin.com/in/kristjan-grm-1572a7159",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    label: "LinkedIn",
  },
];

const FLAGS: Record<string, string> = {
  Amsterdam: "🇳🇱",
  Bangkok: "🇹🇭",
  Barcelona: "🇪🇸",
  Belgrade: "🇷🇸",
  Brussels: "🇧🇪",
  "Buenos Aires": "🇦🇷",
  Cannes: "🇫🇷",
  Istanbul: "🇹🇷",
  Lisbon: "🇵🇹",
  Ljubljana: "🇸🇮",
  London: "🇬🇧",
  "New Delhi": "🇮🇳",
  "New York": "🇺🇸",
  Paris: "🇫🇷",
  Prague: "🇨🇿",
  Seoul: "🇰🇷",
  Taipei: "🇹🇼",
};

interface TimelineItem {
  description: string;
  event: string;
  github?: string;
  location: string;
  name: string;
  prizes?: string;
  showcase?: string;
  type: "hackathon" | "project";
  year: string;
}

const TIMELINE: TimelineItem[] = [
  // 2025
  {
    description: "AI wardrobe management",
    event: "ETHGlobal Buenos Aires",
    github: "https://github.com/grmkris/Closet---eth-global-Buenoes-Aires-2026",
    location: "Buenos Aires",
    name: "Closet",
    prizes: "Coinbase CDP Winner",
    showcase: "https://ethglobal.com/showcase/closet-1fp8d",
    type: "hackathon",
    year: "2025",
  },
  {
    description: "Musician donation platform",
    event: "ETHGlobal New Delhi",
    github: "https://github.com/grmkris/opensource-orchestra",
    location: "New Delhi",
    name: "Opensource Orchestra",
    prizes: "ENS 1st Place",
    showcase: "https://ethglobal.com/showcase/opensource-orchestra-y1egw",
    type: "hackathon",
    year: "2025",
  },
  {
    description: "AI agents pay for APIs autonomously",
    event: "ETHGlobal New York",
    github: "https://github.com/grmkris/eth-global-new-york-2025-auto-toll",
    location: "New York",
    name: "AutoToll",
    showcase: "https://ethglobal.com/showcase/autotoll-h7u9d",
    type: "hackathon",
    year: "2025",
  },
  {
    description: "EIP-7702 hardware wallet sessions",
    event: "ETHGlobal Cannes",
    location: "Cannes",
    name: "SessionFlow",
    prizes: "Avail 2nd Place",
    showcase: "https://ethglobal.com/showcase/sessionflow-t4ok8",
    type: "hackathon",
    year: "2025",
  },
  {
    description: "Festival cashless payments",
    event: "ETHGlobal Prague",
    github: "https://github.com/grmkris/eth-global-prague-2025-mivio",
    location: "Prague",
    name: "Mivio",
    prizes: "Yellow 1st Place",
    showcase: "https://ethglobal.com/showcase/mivio-6ukub",
    type: "hackathon",
    year: "2025",
  },
  {
    description: "AI agent monetization platform",
    event: "BuidlAI Seoul",
    location: "Seoul",
    name: "AgentForge",
    prizes: "Nethermind 1st, Rootstock 1st",
    showcase: "https://devfolio.co/projects/agentforge-815e",
    type: "hackathon",
    year: "2025",
  },
  {
    description: "AI adventure game with evolving NFTs",
    event: "ETHGlobal Taipei",
    github: "https://github.com/grmkris/eth-global-taipei-2025-forheads",
    location: "Taipei",
    name: "Foreheads",
    prizes: "Flow 2nd Place",
    showcase: "https://ethglobal.com/showcase/foreheads-3to1g",
    type: "hackathon",
    year: "2025",
  },
  {
    description: "Privacy-preserving universal AI access",
    event: "ETH Belgrade",
    github: "https://github.com/grmkris/eth-belgrade-2025-universal-basic-ai",
    location: "Belgrade",
    name: "Universal Basic AI",
    type: "hackathon",
    year: "2025",
  },
  // Projects 2025
  {
    description: "AI Oracle for prediction markets",
    event: "Side Project",
    github: "https://yoda.fun",
    location: "Ljubljana",
    name: "yoda.fun",
    type: "project",
    year: "2025",
  },
  {
    description: "Type-safe TypeIDs with Drizzle ORM and Zod validation",
    event: "Open Source",
    github: "https://github.com/grmkris/typeid-drizzle-zod-example",
    location: "Ljubljana",
    name: "typeid-drizzle-zod-example",
    type: "project",
    year: "2025",
  },
  // 2024
  {
    description: "Cross-chain swaps via Circle CCTP",
    event: "ETHGlobal Bangkok",
    github: "https://github.com/Lucianosc/aru-swap",
    location: "Bangkok",
    name: "AruSwap",
    prizes: "CoW DAO 2nd, World Pool Prize",
    showcase: "https://ethglobal.com/showcase/aruswap-ebpfr",
    type: "hackathon",
    year: "2024",
  },
  {
    description: "On-chain Tic-Tac-Toe with prize pools",
    event: "ETHGlobal Brussels",
    github: "https://github.com/grmkris/eth-brussels-2024",
    location: "Brussels",
    name: "TicTac4Ever",
    prizes: "NounsDAO 3rd, Worldcoin Pool",
    showcase: "https://ethglobal.com/showcase/tictac4ever-09zcr",
    type: "hackathon",
    year: "2024",
  },
  {
    description: "Meme voting platform with charitable contributions",
    event: "ETHPrague",
    github: "https://github.com/grmkris/eth-prague-2024",
    location: "Prague",
    name: "Degens for Future",
    prizes: "2nd Place",
    showcase: "https://devfolio.co/projects/degens-for-future-fd7e",
    type: "hackathon",
    year: "2024",
  },
  {
    description: "Social sports betting platform",
    event: "ETHGlobal London",
    github: "https://github.com/grmkris/eth-london-2024",
    location: "London",
    name: "BuddyBet",
    prizes: "Chiliz Pool, Arbitrum Pool",
    showcase: "https://ethglobal.com/showcase/buddybet-tmhp4",
    type: "hackathon",
    year: "2024",
  },
  // Projects 2024
  {
    description: "PostgreSQL real-time audit tables with Drizzle ORM",
    event: "Open Source",
    github: "https://github.com/grmkris/drizzle-pg-notify-audit-table",
    location: "Ljubljana",
    name: "drizzle-pg-notify-audit-table",
    type: "project",
    year: "2024",
  },
  // 2023
  {
    description: "Web3 payment processing with auto-conversion",
    event: "ETHGlobal Istanbul",
    github: "https://github.com/grmkris/eth-global-istanbul",
    location: "Istanbul",
    name: "LoomPay",
    prizes: "Unlimit 2nd, Safe 4th",
    showcase: "https://ethglobal.com/showcase/loompay-8p0us",
    type: "hackathon",
    year: "2023",
  },
  {
    description: "Privacy-focused ZK identity wallet",
    event: "ETHGlobal Paris",
    github: "https://github.com/seddik11/peer-wallet",
    location: "Paris",
    name: "PEERwallet",
    prizes: "Polygon ID 1st, Biconomy Pool",
    showcase: "https://ethglobal.com/showcase/peerwallet-do6c6",
    type: "hackathon",
    year: "2023",
  },
  {
    description: "P2P resource sharing network",
    event: "ETHPrague",
    location: "Prague",
    name: "PeerUp",
    prizes: "5 prizes",
    showcase: "https://devfolio.co/projects/peer-up-e096",
    type: "hackathon",
    year: "2023",
  },
  {
    description: "Private voting system",
    event: "ETHBarcelona",
    location: "Barcelona",
    name: "PeerVote",
    prizes: "Best Public Goods",
    showcase: "https://devfolio.co/projects/peervote-5c90",
    type: "hackathon",
    year: "2023",
  },
  {
    description: "Web2/Web3 credential verification",
    event: "ETHGlobal Lisbon",
    github: "https://github.com/grmkris/checkmarks.io",
    location: "Lisbon",
    name: "checkmarks.io",
    prizes: "Polygon ID 3rd, The Graph Pool",
    showcase: "https://ethglobal.com/showcase/checkmarks-io-ugznb",
    type: "hackathon",
    year: "2023",
  },
  // 2022
  {
    description: "Dapp discovery and showcase platform",
    event: "ETHAmsterdam",
    github: "https://github.com/web3hunt/web3hunt",
    location: "Amsterdam",
    name: "Web3Hunt",
    prizes: "Optimism Deploy, The Graph 1st",
    showcase: "https://ethglobal.com/showcase/web3hunt-43443",
    type: "hackathon",
    year: "2022",
  },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const years = [...new Set(TIMELINE.map((item) => item.year))];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8] selection:bg-blue-500/30">
      {/* Grain texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div
        className={`relative mx-auto max-w-2xl px-6 py-16 transition-all duration-700 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-lg font-medium">Kristjan Grm</h1>
          <p className="mt-1 text-sm text-[#737373]">Slovenia, Ljubljana 🇸🇮</p>
          <p className="mt-4 text-[#a3a3a3] leading-relaxed">
            Hackathons have taken me to Buenos Aires, Seoul, Taipei, Paris,
            Bangkok... the list keeps growing. Life outside the terminal: a cat,
            mountain trails, badminton, good techno, and whatever's cooking.
            Lately building at the intersection of AI, crypto, and
            privacy-preserving tech.
          </p>

          {/* Social links with icons */}
          <div className="mt-6 flex gap-5">
            {SOCIALS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#525252] transition-colors hover:text-[#e8e8e8]"
                title={link.label}
              >
                {link.icon}
              </a>
            ))}
          </div>
        </header>

        {/* Timeline */}
        <section>
          <h2 className="mb-8 text-sm font-medium uppercase tracking-wider text-[#737373]">
            Timeline
          </h2>

          <div className="space-y-8">
            {years.map((year) => (
              <div key={year}>
                <h3 className="mb-4 text-xs font-medium text-[#404040]">
                  {year}
                </h3>
                <div className="space-y-6">
                  {TIMELINE.filter((item) => item.year === year).map((item) => (
                    <div
                      key={item.name}
                      className="border-l border-[#1a1a1a] pl-4 transition-colors hover:border-[#333]"
                    >
                      {/* Event name */}
                      <div className="flex items-center gap-2 text-sm text-[#525252]">
                        <span>{FLAGS[item.location] ?? "🌍"}</span>
                        <span>{item.event}</span>
                      </div>

                      {/* Project name */}
                      <h4 className="mt-1 font-medium text-[#e8e8e8]">
                        {item.name}
                      </h4>

                      {/* Description */}
                      <p className="mt-0.5 text-sm text-[#737373]">
                        {item.description}
                      </p>

                      {/* Prizes */}
                      {item.prizes !== undefined && (
                        <p className="mt-1 text-sm text-blue-400/80">
                          🏆 {item.prizes}
                        </p>
                      )}

                      {/* Links */}
                      <div className="mt-2 flex gap-3">
                        {item.github !== undefined && (
                          <a
                            href={item.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#525252] transition-colors hover:text-[#737373]"
                          >
                            GitHub →
                          </a>
                        )}
                        {item.showcase !== undefined && (
                          <a
                            href={item.showcase}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#525252] transition-colors hover:text-[#737373]"
                          >
                            Showcase →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 border-t border-[#1a1a1a] pt-8">
          <p className="text-sm text-[#525252]">© {new Date().getFullYear()}</p>
        </footer>
      </div>
    </main>
  );
}
