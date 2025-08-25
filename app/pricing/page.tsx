import { PricingHeader } from '@/components/pricing/pricing-header';
import { PricingPlans } from '@/components/pricing/pricing-plans';
import { PricingFAQ } from '@/components/pricing/pricing-faq';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PricingHeader />
      <PricingPlans />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PricingFAQ />
      </div>
    </div>
  );
}
