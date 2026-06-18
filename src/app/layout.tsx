import  { type Metadata } from "next";

import { Fraunces, Hanken_Grotesk } from "next/font/google";
import Script from "next/script";

import "../index.css";
import { Masthead } from "@/components/masthead";
import Providers from "@/components/providers";
import { siteUrl } from "@/lib/site";

const ORIGIN = siteUrl();

const fraunces = Fraunces({
  axes: ["opsz", "SOFT"],
  display: "swap",
  subsets: ["latin"],
  variable: "--font-display",
  weight: "variable",
});

const hanken = Hanken_Grotesk({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-sans",
  weight: "variable",
});

export const metadata: Metadata = {
  description: "Building at the AI × crypto × privacy intersection",
  metadataBase: new URL(ORIGIN),
  openGraph: {
    description: "Building at the AI × crypto × privacy intersection",
    siteName: "kris.gg",
    title: "Kristjan Grm",
    type: "website",
    url: ORIGIN,
  },
  title: {
    default: "Kristjan Grm | Builder",
    template: "%s — Kristjan Grm",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@_krisgg",
    description: "Building at the AI × crypto × privacy intersection",
    title: "Kristjan Grm",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* react-grab dev overlay — local + dev.kris.gg only, never prod */}
        {process.env.NEXT_PUBLIC_VERCEL_ENV !== "production" && (
          <Script
            crossOrigin="anonymous"
            src="//unpkg.com/react-grab/dist/index.global.js"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body
        className={`${fraunces.variable} ${hanken.variable} font-sans antialiased`}
      >
        <Providers>
          <Masthead />
          {children}
        </Providers>
      </body>
    </html>
  );
}
