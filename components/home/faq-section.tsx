'use client';

import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { fadeInUp, staggerContainer } from '@/lib/animations/variants';
import { Card, CardContent } from '../ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { ChevronDownIcon } from 'lucide-react';

const FAQSection = () => {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <section id="faq" className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
        </motion.div>

        <motion.div
          className="space-y-4"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {[
            {
              question: 'Can I use my own branding?',
              answer:
                'Yes! All plans include custom branding options. You can add your logo, colors, and company information to every proposal.',
            },
            {
              question: 'How does AI create proposals?',
              answer:
                'Our AI is trained specifically on cleaning industry best practices. It analyzes your project details and generates professional proposals with accurate pricing and service descriptions.',
            },
            {
              question: 'Do I need a credit card for the trial?',
              answer:
                "No credit card required! Start your free trial immediately and explore all features. You only pay when you're ready to continue.",
            },
            {
              question: 'Is my data secure?',
              answer:
                'Absolutely. We use enterprise-grade security with encrypted data storage, secure multi-tenant architecture, and regular security audits to protect your information.',
            },
            {
              question: 'Can I cancel anytime?',
              answer:
                'Yes, you can cancel your subscription at any time. No long-term contracts or cancellation fees. Your data remains accessible during your billing period.',
            },
          ].map((faq, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Collapsible
                open={openItems.includes(index)}
                onOpenChange={() => toggleItem(index)}
              >
                <Card className="border shadow-sm overflow-hidden">
                  <CollapsibleTrigger className="w-full">
                    <CardContent className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 text-left">
                          {faq.question}
                        </h3>
                        <ChevronDownIcon
                          className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                            openItems.includes(index) ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-6 border-t bg-gray-50/50">
                      <p className="text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
