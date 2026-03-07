export function PricingFAQ() {
  return (
    <div className="mt-20">
      <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
        Frequently Asked Questions
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Can I change my plan later?
          </h3>
          <p className="text-gray-600">
            Yes, you can upgrade or downgrade your plan at any time.
            Changes will be reflected in your next billing cycle.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Is there a free trial?
          </h3>
          <p className="text-gray-600">
            Yes! You get a <strong>7-day free trial</strong> with <strong>3 proposals</strong> included. 
            Credit card is required upfront to start your trial, but you can cancel anytime before 
            the trial ends and you won&apos;t be charged. Your trial ends when either 7 days pass 
            or you&apos;ve used all 3 proposals - whichever comes first.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            What payment methods do you accept?
          </h3>
          <p className="text-gray-600">
            We accept all major credit cards including Visa, MasterCard,
            and American Express.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Can I cancel anytime?
          </h3>
          <p className="text-gray-600">
            Absolutely! You can cancel your subscription at any time - including during your 
            free trial. If you cancel before your trial ends, you won&apos;t be charged at all.
            After the trial, you&apos;ll continue to have access until the end of your billing period.
          </p>
        </div>
      </div>
    </div>
  );
}