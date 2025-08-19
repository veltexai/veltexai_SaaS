'use client';

import { motion } from 'framer-motion';
import React from 'react';
import { fadeInUp } from '@/lib/animations/variants';

const ValueProposition = () => {
  return (
    <section className="py-20 bg-blue-600 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Why Choose Veltex AI?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
            {[
              { title: 'Since 1986', subtitle: 'Trusted industry experience' },
              {
                title: 'Built for Cleaning',
                subtitle: 'Industry-specific, not generic',
              },
              {
                title: 'Save Hours',
                subtitle: 'Eliminate manual proposal work',
              },
              {
                title: 'Scale Fast',
                subtitle: 'Reliable, enterprise-ready platform',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                className="text-center"
                variants={fadeInUp}
              >
                <div className="text-2xl font-bold mb-2">{item.title}</div>
                <div className="text-blue-100">{item.subtitle}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ValueProposition;
