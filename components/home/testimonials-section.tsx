'use client';

import { motion } from 'framer-motion';
import React from 'react';
import { fadeInUp, staggerContainer } from '@/lib/animations/variants';

import { Card, CardContent } from '../ui/card';
import { Star } from 'lucide-react';

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Trusted by Cleaning Professionals
          </h2>
          <div className="flex justify-center items-center space-x-1 mb-4">
            {/* {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
            ))} */}
            <span className="ml-2 text-gray-600">Verified Cleaning Business Owner</span>
          </div>
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
              quote:
                'Veltex AI has transformed how we create proposals. What used to take hours now takes minutes, and our clients love the professional look.',
              author: 'Sarah Johnson',
              title: 'Owner, CleanPro Services',
              rating: 5,
            },
            {
              quote:
                'The AI understands our industry perfectly. Every proposal feels custom-made for our cleaning services. Our close rate has increased by 40%.',
              author: 'Mike Rodriguez',
              title: 'Manager, Spotless Solutions',
              rating: 5,
            },
            {
              quote:
                'Finally, a tool built for cleaning companies by people who understand our business. The time savings alone pays for itself.',
              author: 'Lisa Chen',
              title: 'Director, Elite Janitorial',
              rating: 5,
            },
          ].map((testimonial, index) => (
            <motion.div key={index} variants={fadeInUp}>
              <Card className="p-6 h-full border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 text-yellow-400 fill-current"
                      />
                    ))}
                  </div>
                  <blockquote className="text-gray-600 mb-6 italic">
                    "{testimonial.quote}"
                  </blockquote>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {testimonial.author}
                    </div>
                    <div className="text-sm text-gray-500">
                      {testimonial.title}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Client Logos */}
        {/* <motion.div
          className="mt-16 text-center"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <p className="text-gray-500 mb-8">
            Trusted by leading cleaning companies
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-60">
            {['CleanPro', 'Spotless', 'Elite Clean', 'Pure Services'].map(
              (company, index) => (
                <div key={index} className="text-xl font-bold text-gray-400">
                  {company}
                </div>
              )
            )}
          </div>
        </motion.div> */}
      </div>
    </section>
  );
};

export default TestimonialsSection;
