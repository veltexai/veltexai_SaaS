"use client";

import dynamic from "next/dynamic";
import { ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fadeInUp, staggerContainer } from "@/lib/animations/variants";
import Link from "next/link";
const VideoPlayer = dynamic(() => import("./video-player"), {
  ssr: false,
});

const HeroSection = () => {
  const [playbackProgress, setPlaybackProgress] = React.useState(0); // 0..1
  const features = [
    "Used by cleaning professionals",
    "Built from real janitorial operations",
    "No credit card required",
  ];

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
            Win More Cleaning Contracts <br />
            <span className="text-blue-600">Without Guesswork</span>
          </motion.h1>

          <motion.p
            className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
            variants={fadeInUp}
          >
            Create accurate, professional cleaning proposals in minutes using
            real janitorial pricing logic.
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
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>

          <motion.ul
            className="mt-5 flex flex-col items-center gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-2"
            variants={fadeInUp}
          >
            {features.map((label) => (
              <li
                key={label}
                className="flex max-w-[min(100%,20rem)] items-center gap-2 text-left text-sm text-gray-600 sm:max-w-none"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                  <Check className="h-3 w-3 stroke-[2.5]" aria-hidden />
                </span>
                <span className="leading-snug">{label}</span>
              </li>
            ))}
          </motion.ul>
          {/* <motion.p
            className="mt-3 text-center text-xs text-gray-500 sm:text-sm"
            variants={fadeInUp}
          >
            7-day free trial with 3 proposals
          </motion.p> */}
        </motion.div>

        {/* Video demo — opacity stays 1 so LCP is not delayed */}
        <motion.div
          className="mt-16 max-w-5xl mx-auto"
          initial={{ opacity: 1, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-emerald-500/20 rounded-2xl blur-3xl motion-safe:animate-pulse motion-reduce:animate-none" />
            <div
              className="h-1 rounded-xl bg-blue-600 absolute top-0 left-2 z-40 transition-[width] duration-150 ease-linear"
              style={{ width: `${playbackProgress * 98}%` }}
            />
            {/* <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl px-2 mt-10 mb-3">
              See How Veltex AI Creates Proposals in Under 60 Seconds
            </h2>
            <p className="text-center text-sm text-gray-500 sm:text-base max-w-2xl mx-auto mb-8 px-2">
              Short walkthrough—see inputs turn into a polished proposal, fast.
            </p> */}
            <div className="relative w-full aspect-[1070/600] overflow-hidden rounded-2xl ring-1 ring-gray-200/80 shadow-2xl">
              <VideoPlayer
                src="https://iwoaaljitifloolszxlu.supabase.co/storage/v1/object/public/Intro-Video/Untitled%20design.mp4"
                placeholderImage="/images/dashboard-light.webp"
                playbackProgress={playbackProgress}
                setPlaybackProgress={setPlaybackProgress}
              />
              <div className="pointer-events-none absolute top-3 left-3 z-30 hidden items-center gap-2 rounded-full border border-white/20 bg-gray-900/65 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md sm:flex">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span>
                  Quick demo · ~ See How Veltex AI Creates Proposals in Under 60
                  Seconds
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
