import { PricingHeader } from '@/features/pricing/components/pricing-header';
import { PricingFAQ } from '@/features/pricing/components/pricing-faq';
import type { Metadata } from 'next';
import PricingSection from '@/features/home/components/pricing-section';

export const metadata: Metadata = {
  title: 'Cleaning Proposal Software Pricing',
  description: 'Compare Veltex AI plans for creating professional commercial cleaning and janitorial proposals. Start with a free trial.',
  alternates: { canonical: '/pricing' },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PricingHeader />
      <PricingSection />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PricingFAQ />
      </div>
    </div>
  );
}
