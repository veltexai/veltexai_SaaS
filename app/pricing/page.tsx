import { Suspense } from 'react';
import { PricingHeader } from '@/features/pricing/components/pricing-header';
import { PricingPlans } from '@/features/pricing/components/pricing-plans';
import { PricingFAQ } from '@/features/pricing/components/pricing-faq';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PricingHeader />
      <Suspense fallback={<div>Loading...</div>}>
        {/* <PricingPlans /> */}
      </Suspense>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PricingFAQ />
      </div>
    </div>
  );
}
