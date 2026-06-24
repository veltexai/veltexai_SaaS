import type { Metadata } from "next";

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
  return children;
}
