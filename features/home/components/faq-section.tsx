'use client';

import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { fadeInUp, staggerContainer } from '@/lib/animations/variants';
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
          className="space-y-0 divide-y divide-gray-200"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {[
            {
              question:
                'Why building a great landing page is critical for your business?',
              answer:
                "In today's AI-driven world, standing out is harder than ever. While anyone can build a product, a professional landing page makes the difference between success and failure.\n\nLaunch UI helps you ship faster without compromising on quality.",
            },
            {
              question: 'Why use Launch UI instead of a no-code tool?',
              answer:
                'Launch UI gives you complete control over your code and design, unlike no-code tools that limit customization and can become expensive as you scale.',
            },
            {
              question:
                'How Launch UI is different from other components libraries and templates?',
              answer:
                'Launch UI provides production-ready components with built-in best practices, accessibility, and performance optimizations that save you weeks of development time.',
            },
            {
              question: 'Why exactly does it mean that "The code is yours"?',
              answer:
                'You get the complete source code with no dependencies on our services. You own it forever and can modify, extend, or redistribute it as needed.',
            },
            {
              question: 'Are Figma files included?',
              answer:
                'Yes, all components come with corresponding Figma files so designers and developers can work seamlessly together.',
            },
            {
              question: 'Can I get a discount?',
              answer:
                'We offer student discounts and volume pricing for teams. Contact us for special pricing options.',
            },
          ].map((faq, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Collapsible
                open={openItems.includes(index)}
                onOpenChange={() => toggleItem(index)}
              >
                <CollapsibleTrigger className="w-full py-6 text-left hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between px-0">
                    <h3 className="text-lg font-medium text-gray-900 pr-8">
                      {faq.question}
                    </h3>
                    <ChevronDownIcon
                      className={`h-5 w-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                        openItems.includes(index) ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pb-6 pr-12">
                    <div className="text-gray-600 leading-relaxed whitespace-pre-line">
                      {faq.answer}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
