'use client';

import { motion } from 'framer-motion';
import { Calculator, ClipboardCheck, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { fadeInUp, staggerContainer } from '@/lib/animations/variants';

const steps = [
  { title: 'Capture the scope', description: 'Record the facility, service areas, frequency, conditions, and special requirements that shape the work.', icon: ClipboardCheck },
  { title: 'Review the assumptions', description: 'See the labor, production, service, and margin inputs behind the recommendation before relying on it.', icon: Calculator },
  { title: 'Present the proposal', description: 'Turn the reviewed job details into a consistent, branded proposal for your customer.', icon: FileText },
];

export default function TestimonialsSection() {
  return (
    <section className="bg-gray-50 py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="mb-12 text-center" initial="initial" whileInView="animate" viewport={{ once: true }} variants={fadeInUp}>
          <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">Built Around a Real Cleaning Bid</h2>
          <p className="mx-auto max-w-3xl text-gray-600">Veltex AI connects the operational details of a cleaning job to a proposal you can inspect, edit, and present professionally.</p>
        </motion.div>
        <motion.div className="grid gap-8 md:grid-cols-3" initial="initial" whileInView="animate" viewport={{ once: true }} variants={staggerContainer}>
          {steps.map((item) => (
            <motion.div key={item.title} variants={fadeInUp}>
              <Card className="h-full border-0 p-6 shadow-lg"><CardContent className="pt-6">
                <item.icon className="mb-5 h-8 w-8 text-blue-600" />
                <h3 className="mb-3 text-xl font-semibold text-gray-900">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </CardContent></Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
