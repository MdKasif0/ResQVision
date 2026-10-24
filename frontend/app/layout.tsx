import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ResQVision — Incident Triage & Evidentiary Assessment",
  description:
    "Evidentiary incident triage platform combining deterministic computer vision and structured LLM reasoning.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#FAF8F4] text-[#1F1D1A] min-h-screen antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
