"use client";

import { ArrowRight, Mail } from "lucide-react";
import { motion } from "framer-motion";
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fadeInUp, staggerContainer } from "@/lib/animations/variants";
import Link from "next/link";
import Image from "next/image";

const HeroSection = () => {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [playbackProgress, setPlaybackProgress] = React.useState(0); // 0..1
  const [showVideo, setShowVideo] = React.useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowVideo(true);
    }, 1500); // 1–1.5s is sweet spot

    return () => clearTimeout(timer);
  }, []);

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
              Built on decades of real cleaning industry experience
            </Badge>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight"
            variants={fadeInUp}
          >
            The Smarter Way to Win{" "}
            <span className="text-blue-600">Cleaning Contracts</span>
          </motion.h1>

          <motion.p
            className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
            variants={fadeInUp}
          >
            Generate polished, client-ready proposals in seconds — email or
            download with a single click.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            variants={fadeInUp}
          >
            <Link href={"#pricing"}>
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3"
              >
                Start 7-Day Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href={"/auth/signup?method=magic"}>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-3 bg-transparent"
              >
                <Mail className="mr-2 h-5 w-5" />
                Sign Up with Email
              </Button>
            </Link>
          </motion.div>

          {/* Trial Info */}
          <motion.p className="text-sm text-gray-500 mt-4" variants={fadeInUp}>
            7-day free trial with 3 proposals • No credit card required to start
          </motion.p>
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
            <div
              className="h-1 rounded-xl bg-blue-600 absolute top-0 left-2 z-40 transition-[width] duration-150 ease-linear"
              style={{ width: `${playbackProgress * 98}%` }}
            />
            <div className="relative w-full aspect-[1070/600] overflow-hidden rounded-2xl">
              {/* IMAGE FIRST (fast LCP) */}
              <Image
                width={1070}
                height={600}
                src="/images/dashboard-light.webp"
                className="absolute inset-0 w-full h-full rounded-2xl shadow-2xl border border-gray-200 object-cover"
                alt="Preview"
              />

              {/* VIDEO AFTER */}
              {showVideo && (
                <video
                  src="https://iwoaaljitifloolszxlu.supabase.co/storage/v1/object/public/Intro-Video/Untitled%20design.mp4"
                  className="absolute inset-0 w-full h-full rounded-2xl shadow-2xl border border-gray-200 object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
