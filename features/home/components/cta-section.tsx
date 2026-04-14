"use client";

import { motion } from "framer-motion";
import React from "react";
import { fadeInUp } from "@/lib/animations/variants";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

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
          <Link href="/auth/login">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="text-sm text-blue-100/80 mt-4">
            No credit card required
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
