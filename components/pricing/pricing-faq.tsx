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
            Yes, all plans come with a 14-day free trial. No credit card
            required to start.
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
            Yes, you can cancel your subscription at any time. You'll
            continue to have access until the end of your billing period.
          </p>
        </div>
      </div>
    </div>
  );
}