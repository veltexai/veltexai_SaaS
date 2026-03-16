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
