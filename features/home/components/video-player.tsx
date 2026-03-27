"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Play, X } from "lucide-react";

export default function VideoPlayer({
  src,
  placeholderImage,
  playbackProgress,
  setPlaybackProgress,
}: {
  src: string;
  placeholderImage: string;
  playbackProgress: number;
  setPlaybackProgress: (progress: number) => void;
}) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    if (!mobile) {
      setShouldLoad(true);
    }
  }, []);

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  // Desktop: existing autoplay behavior
  if (!isMobile) {
    return (
      <div>
        {shouldLoad ? (
          <video
            src={src}
            className="absolute inset-0 w-full h-full rounded-2xl shadow-2xl border border-gray-200 object-cover"
            autoPlay
            loop
            muted
            playsInline
            onTimeUpdate={(e) => {
              setPlaybackProgress(
                (e.target as HTMLVideoElement).currentTime /
                  (e.target as HTMLVideoElement).duration,
              );
            }}
          />
        ) : (
          <Image
            width={1070}
            height={600}
            src={placeholderImage}
            className="absolute inset-0 w-full h-full rounded-2xl shadow-2xl border border-gray-200 object-cover"
            alt="Dashboard preview"
            priority
          />
        )}
      </div>
    );
  }

  // Mobile: static image + "Watch Demo" button; video only loads on demand
  return (
    <>
      <div className="absolute inset-0">
        <Image
          width={1070}
          height={600}
          src={placeholderImage}
          className="w-full h-full rounded-2xl shadow-2xl border border-gray-200 object-cover"
          alt="Dashboard preview"
          priority
        />
        <div className="absolute inset-0 flex items-end justify-center pb-6">
          <button
            onClick={() => setModalOpen(true)}
            className="flex cursor-pointer items-center gap-2 bg-white/90 backdrop-blur-lg text-gray-900 font-semibold px-5 py-3 rounded-full shadow-2xl hover:bg-white active:scale-95 transition-all"
            aria-label="Watch demo video"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600">
              <Play className="h-3.5 w-3.5 fill-white text-white ml-0.5" />
            </span>
            See how it works
          </button>
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-2xl">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute -top-10 right-0 flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm"
              aria-label="Close video"
            >
              <X className="h-5 w-5" />
              Close
            </button>
            <video
              src={src}
              className="w-full rounded-xl shadow-2xl"
              autoPlay
              playsInline
            />
          </div>
        </div>
      )}
    </>
  );
}
