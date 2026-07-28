import type { Metadata } from "next";
import { Inter } from "next/font/google";

// Scoped to /demo-proposal only — the root layout keeps Geist/Montserrat/Arvo.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Try a Demo Proposal | Veltex AI",
  description:
    "Experience a professional commercial or residential cleaning proposal in under 3 minutes. No signup required.",
  robots: "index, follow",
};

export default function DemoProposalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={inter.variable}>{children}</div>;
}
