import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";

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
  metadataBase: new URL("https://kris.gg"),
  openGraph: {
    description: "Building at the AI × crypto × privacy intersection",
    siteName: "kris.gg",
    title: "Kristjan Grm",
    type: "website",
    url: "https://kris.gg",
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
      <body
        className={`${fraunces.variable} ${hanken.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
