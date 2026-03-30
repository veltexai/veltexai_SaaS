import {
  Header,
  HeroSection,
  HowItWorksSection,
  FeatureSection,
  ValueProposition,
  PricingSection,
  TestimonialsSection,
  CTASection,
  FAQSection,
  FooterSection,
} from "@/features/home";
import LenisProvider from "@/providers/lenis-provider";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.veltexai.com";
const defaultTitle = "Generate Professional Cleaning Proposals in Minutes";
const defaultDescription =
  "Price jobs correctly and win more contracts with Veltex AI";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: defaultTitle,
  description: defaultDescription,
  openGraph: {
    type: "website",
    url: siteUrl,
    title: defaultTitle,
    description: defaultDescription,
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: ["/images/og-image.png"],
  },
};

export default function LandingPage() {
  return (
    <LenisProvider>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header Section */}
        <Header />

        {/* Hero Section */}
        <HeroSection />

        {/* How it works Section */}
        <HowItWorksSection />

        {/* Feature Section */}
        <FeatureSection />

        {/* Value Proposition */}
        <ValueProposition />

        {/* Pricing SEction */}
        <PricingSection />

        {/* Testimonials Section */}
        <TestimonialsSection />

        {/* CTA Section */}
        <CTASection />

        {/* FAQ section */}
        <FAQSection />

        {/* Footer */}
        <FooterSection />
      </main>
    </LenisProvider>
  );
}
