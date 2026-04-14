"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Play } from "lucide-react";

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

  useEffect(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    if (!mobile) {
      setShouldLoad(true);
    }
  }, []);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (!v.duration || Number.isNaN(v.duration)) return;
    setPlaybackProgress(v.currentTime / v.duration);
  };

  return (
    <>
      {shouldLoad ? (
        <video
          src={src}
          className="absolute inset-0 w-full h-full rounded-2xl shadow-2xl border border-gray-200 object-cover"
          autoPlay
          loop
          muted
          playsInline
          onTimeUpdate={handleTimeUpdate}
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

      {isMobile && !shouldLoad && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-end gap-2 pb-5">
          <p className="px-4 text-center text-xs font-medium text-white/95 drop-shadow-md sm:text-sm">
            ~60 second demo · tap to watch
          </p>
          <button
            type="button"
            onClick={() => setShouldLoad(true)}
            className="group flex cursor-pointer items-center gap-2.5 rounded-full bg-white/95 px-5 py-3 font-semibold text-gray-900 shadow-2xl shadow-blue-900/20 ring-2 ring-blue-500/25 backdrop-blur-lg transition-all hover:bg-white hover:ring-blue-500/40 active:scale-[0.98]"
            aria-label="Watch 60-second product demo"
          >
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 shadow-inner shadow-blue-900/30">
              <span className="absolute inset-0 rounded-full bg-blue-400/40 motion-safe:animate-ping motion-reduce:animate-none" />
              <Play className="relative ml-0.5 h-3.5 w-3.5 fill-white text-white" />
            </span>
            Watch 60-second demo
          </button>
        </div>
      )}
    </>
  );
}
