import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ResQVision — AI-Powered Disaster Intelligence",
  description:
    "Turn disaster imagery into clear, evidence-based insights with computer vision and structured AI reasoning.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="landing-root min-h-screen bg-[#060C14] text-white selection:bg-[#FF5751]/30 selection:text-white">
      {children}
    </div>
  );
}
