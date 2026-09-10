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
  ResourceDiscoverySection,
} from "@/features/home";
import LenisProvider from "@/providers/lenis-provider";
import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const defaultTitle = "Cleaning Proposal Software for Janitorial Companies";
const defaultDescription = SITE_DESCRIPTION;

export const metadata: Metadata = {
  title: defaultTitle,
  description: defaultDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
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
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/images/IMG_3800.webp`,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
    ],
  };

  return (
    <LenisProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
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

        <ResourceDiscoverySection />

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
