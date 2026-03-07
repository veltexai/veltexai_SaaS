import Header from '@/features/home/components/header';
import HeroSection from '@/features/home/components/hero-section';
import HowItWorksSection from '@/features/home/components/how-works';
import FeatureSection from '@/features/home/components/features-section';
import ValueProposition from '@/features/home/components/value-proposition';
import PricingSection from '@/features/home/components/pricing-section';
import TestimonialsSection from '@/features/home/components/testimonials-section';
import CTASection from '@/features/home/components/cta-section';
import FAQSection from '@/features/home/components/faq-section';
import FooterSection from '@/features/home/components/footer-section';
import LenisProvider from '@/components/providers/lenis-provider';

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
