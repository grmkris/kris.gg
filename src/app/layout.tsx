import  { type Metadata } from "next";

import { JetBrains_Mono } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  description: "Building at the AI × blockchain intersection",
  openGraph: {
    description:
      "Full-stack engineer & CTO building at the AI × blockchain intersection",
    siteName: "kris.gg",
    title: "Kristjan Grm",
    type: "website",
    url: "https://kris.gg",
  },
  title: "Kristjan Grm | Full-Stack Engineer & CTO",
  twitter: {
    card: "summary",
    creator: "@_krisgg",
    description:
      "Full-stack engineer & CTO building at the AI × blockchain intersection",
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
