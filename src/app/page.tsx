/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useState } from "react";

const SOCIALS = [
  { href: "https://github.com/grmkris", label: "GitHub" },
  { href: "https://x.com/_krisgg", label: "X" },
  { href: "https://linkedin.com/in/kristjan-grm-1572a7159", label: "LinkedIn" },
];

interface Hackathon {
  name: string;
  location: string;
  prizes?: string;
  description: string;
  github?: string;
  showcase?: string;
}

const HACKATHONS: Record<string, Hackathon[]> = {
  "2022": [
    {
      description: "Dapp discovery platform",
      github: "https://github.com/web3hunt/web3hunt",
      location: "Amsterdam",
      name: "Web3Hunt",
      prizes: "Optimism, The Graph 1st",
      showcase: "https://ethglobal.com/showcase/web3hunt-43443",
    },
  ],
  "2023": [
    {
      description: "Web3 payment processing",
      github: "https://github.com/grmkris/eth-global-istanbul",
      location: "Istanbul",
      name: "LoomPay",
      prizes: "Unlimit 2nd, Safe 4th",
      showcase: "https://ethglobal.com/showcase/loompay-8p0us",
    },
    {
      description: "Privacy-focused ZK wallet",
      github: "https://github.com/seddik11/peer-wallet",
      location: "Paris",
      name: "PEERwallet",
      prizes: "Polygon ID 1st, Biconomy Pool",
      showcase: "https://ethglobal.com/showcase/peerwallet-do6c6",
    },
    {
      description: "P2P resource sharing",
      location: "Prague",
      name: "PeerUp",
      prizes: "5 prizes",
      showcase: "https://devfolio.co/projects/peer-up-e096",
    },
    {
      description: "Private voting system",
      location: "Barcelona",
      name: "PeerVote",
      prizes: "Best Public Goods",
      showcase: "https://devfolio.co/projects/peervote-5c90",
    },
    {
      description: "Web2/Web3 credential verification",
      github: "https://github.com/grmkris/checkmarks.io",
      location: "Lisbon",
      name: "checkmarks.io",
      prizes: "Polygon ID 3rd, The Graph Pool",
      showcase: "https://ethglobal.com/showcase/checkmarks-io-ugznb",
    },
  ],
  "2024": [
    {
      description: "Cross-chain swaps via CCTP",
      github: "https://github.com/Lucianosc/aru-swap",
      location: "Bangkok",
      name: "AruSwap",
      prizes: "CoW DAO 2nd, World Pool",
      showcase: "https://ethglobal.com/showcase/aruswap-ebpfr",
    },
    {
      description: "On-chain Tic-Tac-Toe",
      github: "https://github.com/grmkris/eth-brussels-2024",
      location: "Brussels",
      name: "TicTac4Ever",
      prizes: "NounsDAO 3rd, Worldcoin Pool",
      showcase: "https://ethglobal.com/showcase/tictac4ever-09zcr",
    },
    {
      description: "Social sports betting",
      github: "https://github.com/grmkris/eth-london-2024",
      location: "London",
      name: "BuddyBet",
      prizes: "Chiliz Pool, Arbitrum Pool",
      showcase: "https://ethglobal.com/showcase/buddybet-tmhp4",
    },
  ],
  "2025": [
    {
      description: "AI wardrobe management",
      github:
        "https://github.com/grmkris/Closet---eth-global-Buenoes-Aires-2026",
      location: "Buenos Aires",
      name: "Closet",
      prizes: "Coinbase CDP",
      showcase: "https://ethglobal.com/showcase/closet-1fp8d",
    },
    {
      description: "Musician donation platform",
      github: "https://github.com/grmkris/opensource-orchestra",
      location: "New Delhi",
      name: "Opensource Orchestra",
      prizes: "ENS 1st",
      showcase: "https://ethglobal.com/showcase/opensource-orchestra-y1egw",
    },
    {
      description: "AI agents pay for APIs",
      github: "https://github.com/grmkris/eth-global-new-york-2025-auto-toll",
      location: "New York",
      name: "AutoToll",
      showcase: "https://ethglobal.com/showcase/autotoll-h7u9d",
    },
    {
      description: "EIP-7702 hardware wallet sessions",
      location: "Cannes",
      name: "SessionFlow",
      prizes: "Avail 2nd",
      showcase: "https://ethglobal.com/showcase/sessionflow-t4ok8",
    },
    {
      description: "Festival cashless payments",
      github: "https://github.com/grmkris/eth-global-prague-2025-mivio",
      location: "Prague",
      name: "Mivio",
      prizes: "Yellow 1st",
      showcase: "https://ethglobal.com/showcase/mivio-6ukub",
    },
    {
      description: "AI agent monetization",
      location: "Seoul",
      name: "AgentForge",
      prizes: "Nethermind 1st, Rootstock 1st",
      showcase: "https://devfolio.co/projects/agentforge-815e",
    },
    {
      description: "AI adventure game with evolving NFTs",
      github: "https://github.com/grmkris/eth-global-taipei-2025-forheads",
      location: "Taipei",
      name: "Foreheads",
      prizes: "Flow 2nd",
      showcase: "https://ethglobal.com/showcase/foreheads-3to1g",
    },
  ],
};

const PROJECTS = [
  {
    description: "AI Oracle for prediction markets",
    name: "yoda.fun",
    url: "https://yoda.fun",
  },
  {
    description: "PostgreSQL real-time audit tables",
    name: "drizzle-pg-notify-audit-table",
    stars: 44,
    url: "https://github.com/grmkris/drizzle-pg-notify-audit-table",
  },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const years = Object.keys(HACKATHONS).toSorted(
    (a, b) => Number(b) - Number(a)
  );
  const totalPrizes = Object.values(HACKATHONS)
    .flat()
    .filter((h) => h.prizes !== undefined).length;

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
        <header className="mb-16">
          <h1 className="text-lg font-medium">Kristjan Grm</h1>
          <p className="mt-1 text-sm text-[#737373]">Ljubljana, Slovenia</p>
          <p className="mt-4 text-[#a3a3a3]">
            Full-stack engineer & CTO building at the{" "}
            <span className="text-[#e8e8e8]">AI × blockchain</span>{" "}
            intersection.
          </p>

          {/* Social links */}
          <div className="mt-4 flex gap-4">
            {SOCIALS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#737373] transition-colors hover:text-[#e8e8e8]"
              >
                {link.label}
              </a>
            ))}
          </div>
        </header>

        {/* Projects */}
        <section className="mb-16">
          <h2 className="mb-6 text-sm font-medium uppercase tracking-wider text-[#737373]">
            Projects
          </h2>
          <div className="space-y-4">
            {PROJECTS.map((project) => (
              <a
                key={project.name}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[#e8e8e8] transition-colors group-hover:text-blue-400">
                    {project.name}
                  </span>
                  {project.stars !== undefined && (
                    <span className="text-xs text-[#525252]">
                      {project.stars}⭐
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#737373]">{project.description}</p>
              </a>
            ))}
          </div>
        </section>

        {/* Hackathons */}
        <section>
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-[#737373]">
            Hackathons
          </h2>
          <p className="mb-8 text-sm text-[#525252]">
            {Object.values(HACKATHONS).flat().length} events · {totalPrizes}+
            prizes
          </p>

          <div className="space-y-12">
            {years.map((year) => (
              <div key={year}>
                <h3 className="mb-4 text-xs font-medium text-[#525252]">
                  {year}
                </h3>
                <div className="space-y-6">
                  {HACKATHONS[year].map((hack) => (
                    <div
                      key={hack.name}
                      className="group border-l border-[#262626] pl-4 transition-colors hover:border-[#404040]"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium text-[#e8e8e8]">
                          {hack.name}
                        </span>
                        <span className="text-sm text-[#525252]">
                          {hack.location}
                        </span>
                      </div>

                      {hack.prizes !== undefined && (
                        <p className="mt-1 text-sm text-blue-400/80">
                          {hack.prizes}
                        </p>
                      )}

                      <p className="mt-1 text-sm text-[#737373]">
                        {hack.description}
                      </p>

                      <div className="mt-2 flex gap-3">
                        {hack.github !== undefined && (
                          <a
                            href={hack.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#525252] transition-colors hover:text-[#737373]"
                          >
                            GitHub →
                          </a>
                        )}
                        {hack.showcase !== undefined && (
                          <a
                            href={hack.showcase}
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
          <p className="text-sm text-[#525252]">
            © {new Date().getFullYear()} · Built with Next.js
          </p>
        </footer>
      </div>
    </main>
  );
}
