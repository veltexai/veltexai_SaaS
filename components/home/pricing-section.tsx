'use client';

import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { fadeInUp, staggerContainer } from '@/lib/animations/variants';
import { Badge } from '../ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';

const PricingSection = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(
    'monthly'
  );
  return (
    <section id="pricing" className="py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Choose the plan that fits your business needs
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            <span
              className={
                billingCycle === 'monthly'
                  ? 'text-gray-900 font-medium'
                  : 'text-gray-500'
              }
            >
              Monthly
            </span>
            <button
              onClick={() =>
                setBillingCycle(
                  billingCycle === 'monthly' ? 'annual' : 'monthly'
                )
              }
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span
              className={
                billingCycle === 'annual'
                  ? 'text-gray-900 font-medium'
                  : 'text-gray-500'
              }
            >
              Annual
              <Badge className="ml-2 bg-emerald-100 text-emerald-700">
                Save 20%
              </Badge>
            </span>
          </div>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-7 max-w-5xl mx-auto"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {[
            {
              name: 'Starter',
              price: billingCycle === 'monthly' ? 19.9 : 24,
              period:
                billingCycle === 'monthly'
                  ? '/month'
                  : '/month (billed annually)',
              description: 'Perfect for small cleaning businesses',
              features: [
                '20 proposals per month',
                'Basic AI templates',
                'PDF export',
                'Email support',
                'Basic branding',
              ],
              popular: false,
            },
            {
              name: 'Professional',
              price: billingCycle === 'monthly' ? 39.9 : 64,
              period:
                billingCycle === 'monthly'
                  ? '/month'
                  : '/month (billed annually)',
              description: 'For growing cleaning companies',
              features: [
                '75 proposals per month',
                'Advanced AI templates',
                'Custom branding',
                'Priority support',
                'Team collaboration',
                'Analytics dashboard',
              ],
              popular: true,
            },
            {
              name: 'Enterprise',
              price: billingCycle === 'monthly' ? 79.9 : 159,
              period:
                billingCycle === 'monthly'
                  ? '/month'
                  : '/month (billed annually)',
              description: 'For large cleaning operations',
              features: [
                'Unlimited proposals',
                'Custom AI training',
                'White-label solution',
                'Dedicated support',
                'API access',
                'Custom integrations',
              ],
              popular: false,
            },
          ].map((plan, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Card
                className={`relative p-8 h-full ${
                  plan.popular
                    ? 'border-2 border-blue-600 shadow-xl'
                    : 'border shadow-lg'
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-xl font-bold">
                    {plan.name}
                  </CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      ${plan.price}
                    </span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                  <CardDescription className="mt-2">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-900 hover:bg-gray-800'
                    }`}
                    size="lg"
                  >
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
