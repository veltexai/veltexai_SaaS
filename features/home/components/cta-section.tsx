"use client";

import { motion } from "framer-motion";
import React from "react";
import { fadeInUp } from "@/lib/animations/variants";
import { MarketingCTAs } from "./marketing-ctas";

const CTASection = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-emerald-600 text-white">
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-balance">
            Ready to Win More Cleaning Contracts?
          </h2>
          <p className="text-lg sm:text-xl mb-8 text-blue-100 max-w-2xl mx-auto text-pretty">
            Start your free trial and create your first proposal in minutes.
          </p>
          <MarketingCTAs variant="gradient" />
          <p className="text-sm text-blue-100/80 mt-4">
            No credit card required
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
