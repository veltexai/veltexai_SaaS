'use client';

import { motion } from 'framer-motion';
import React from 'react';
import { fadeInUp } from '@/lib/animations/variants';
import { Button } from '../ui/button';
import { ArrowRight } from 'lucide-react';

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
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Streamline Your Proposals?
          </h2>
          <p className="text-xl mb-6 text-blue-100">
            Join hundreds of cleaning companies saving time and winning more
            business
          </p>
          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
          >
            Start 7-Day Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-sm text-blue-100/80 mt-4">
            7-day free trial with 3 proposals • Credit card required • Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
