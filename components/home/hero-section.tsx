'use client';

import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { fadeInUp, staggerContainer } from '@/lib/animations/variants';
import Image from 'next/image';

const HeroSection = () => {
  return (
    <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center max-w-4xl mx-auto"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp}>
            <Badge className="mb-6 bg-emerald-50 text-emerald-700 border-emerald-200">
              Trusted by cleaning companies since 1986
            </Badge>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight"
            variants={fadeInUp}
          >
            AI-Powered Proposals for the{' '}
            <span className="text-blue-600">Cleaning Industry</span>
          </motion.h1>

          <motion.p
            className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
            variants={fadeInUp}
          >
            Generate professional, branded PDF proposals in minutes — trusted by
            janitorial companies since 1986. Save hours of manual work with AI
            that understands your industry.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            variants={fadeInUp}
          >
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8 py-3 bg-transparent"
            >
              Book a Demo
            </Button>
          </motion.div>
        </motion.div>

        {/* Hero Image/Dashboard Mockup */}
        <motion.div
          className="mt-16 max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-emerald-500/20 rounded-2xl blur-3xl"></div>
            <Image
              width={1000}
              height={600}
              src="/placeholder.svg?height=600&width=1000"
              alt="Veltex AI Dashboard"
              className="relative rounded-2xl shadow-2xl border border-gray-200"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
