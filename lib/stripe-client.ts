export const getStripeJs = async () => {
  const stripeJs = await import('@stripe/stripe-js');
  return stripeJs.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};