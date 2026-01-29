import  { type Metadata } from "next";

import { JetBrains_Mono } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
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
  title: "Kristjan Grm | Builder",
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
      <body className={`${jetbrainsMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
