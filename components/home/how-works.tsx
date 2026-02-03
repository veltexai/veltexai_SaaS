'use client';

import { motion } from 'framer-motion';
import React from 'react';
import { fadeInUp, staggerContainer } from '@/lib/animations/variants';
import { CheckCircle, FileText, Zap } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

const HowItWorksSection = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Three simple steps to professional proposals
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-8"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {[
            {
              step: '01',
              title: 'Takes 2–3 minutes',
              description:
                'Fill out a simple form with your client information, project scope, and cleaning requirements.',
              icon: FileText,
            },
            {
              step: '02',
              title: 'Built-in janitorial pricing logic',
              description:
                'Our AI creates a tailored, professional proposal based on industry best practices and your specifications.',
              icon: Zap,
            },
            {
              step: '03',
              title: 'Ready-to-send PDFs',
              description:
                'Download your fully branded PDF proposal ready to send to clients. Professional results every time.',
              icon: CheckCircle,
            },
          ].map((item, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Card className="text-center p-8 h-full border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <item.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="text-sm font-semibold text-blue-600 mb-2">
                    STEP {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
