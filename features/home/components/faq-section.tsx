"use client";

import { motion } from "framer-motion";
import React, { useState } from "react";
import { fadeInUp, staggerContainer } from "@/lib/animations/variants";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDownIcon } from "lucide-react";
import { FAQ_ITEMS } from "../constants/faq";

const FAQSection = () => {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
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
          {FAQ_ITEMS.map((faq, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Collapsible
                open={openItems.includes(index)}
                onOpenChange={() => toggleItem(index)}
              >
                <CollapsibleTrigger className="w-full py-6 text-left hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between px-0">
                    <h3 className="text-lg font-medium text-gray-900 pl-4 pr-8">
                      {faq.question}
                    </h3>
                    <ChevronDownIcon
                      className={`h-5 w-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                        openItems.includes(index) ? "rotate-180" : ""
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
