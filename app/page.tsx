import Header from '@/components/home/header';
import HeroSection from '@/components/home/hero-section';
import HowItWorksSection from '@/components/home/how-works';
import FeatureSection from '@/components/home/features-section';
import ValueProposition from '@/components/home/value-proposition';
import PricingSection from '@/components/home/pricing-section';
import TestimonialsSection from '@/components/home/testimonials-section';
import CTASection from '@/components/home/cta-section';
import FAQSection from '@/components/home/faq-section';
import FooterSection from '@/components/home/footer-section';

export default function LandingPage() {
  return (
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
  );
}
