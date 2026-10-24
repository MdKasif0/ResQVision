import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ResQVision — Disaster Management & Live Incident Map",
  description:
    "Real-time disaster management and emergency incident intelligence platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#0A0D14] text-white min-h-screen antialiased selection:bg-red-500/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
