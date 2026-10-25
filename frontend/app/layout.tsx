import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const sansFont = localFont({
  src: "./fonts/SFPro.ttf",
  variable: "--font-geometric",
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
    <html lang="en" className={sansFont.variable}>
      <body className="bg-[#FAF8F4] text-[#1F1D1A] min-h-screen antialiased selection:bg-[#1F1D1A] selection:text-[#FAF8F4]">
        {children}
      </body>
    </html>
  );
}
