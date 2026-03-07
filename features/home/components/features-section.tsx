'use client';

import { motion } from 'framer-motion';
import React from 'react';
import { fadeInUp, staggerContainer } from '@/lib/animations/variants';
import {
  BarChart3,
  CheckCircle,
  FileText,
  Shield,
  Users,
  Zap,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';

const FeatureSection = () => {
  return (
    <section id="features" className="py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Vertical AI operating system for janitorial companies, not generic SaaS
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {[
            {
              title: 'Operational Intelligence Engine',
              description:
                'Scope → Labor → Pricing → Proposal. Outputs constrained by real janitorial labor, frequency, and margin rules.',
              icon: Zap,
            },
            {
              title: 'Instant PDF Export',
              description:
                'Professional, branded PDFs ready to send to clients immediately.',
              icon: FileText,
            },
            {
              title: 'Subscription Management',
              description:
                'Flexible plans with usage limits that scale with your business.',
              icon: BarChart3,
            },
            {
              title: 'Secure Multi-Tenant',
              description:
                'Enterprise-grade security with isolated client data and accounts.',
              icon: Shield,
            },
            {
              title: 'Admin Dashboard',
              description:
                'Comprehensive dashboard for managing proposals, clients, and team members.',
              icon: Users,
            },
            {
              title: 'Stripe Integration',
              description:
                'Seamless payment processing and subscription billing built-in.',
              icon: CheckCircle,
            },
          ].map((feature, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Card className="p-6 h-full border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeatureSection;
