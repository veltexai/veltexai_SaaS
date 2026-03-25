"use client";

import { useEffect, useRef } from "react";

interface LenisProviderProps {
  children: React.ReactNode;
}

export default function LenisProvider({ children }: LenisProviderProps) {
  const lenisRef = useRef<import("lenis").default | null>(null);

  useEffect(() => {
    let rafId = 0;

    const init = () => {
      import("lenis").then(({ default: Lenis }) => {
        const lenis = new Lenis({
          lerp: 0.1,
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: "vertical",
          gestureOrientation: "vertical",
          smoothWheel: true,
          wheelMultiplier: 1,
          touchMultiplier: 2,
          infinite: false,
        });

        lenisRef.current = lenis;

        const raf = (time: number) => {
          lenis.raf(time);
          rafId = requestAnimationFrame(raf);
        };
        rafId = requestAnimationFrame(raf);
      });
    };

    // Defer Lenis until the browser is idle — never blocks first paint or hydration.
    // Falls back to a 300 ms timeout for browsers without requestIdleCallback (Safari < 16.4).
    if ("requestIdleCallback" in window) {
      const id = (window as Window & typeof globalThis).requestIdleCallback(
        init,
        {
          timeout: 2000,
        },
      );
      return () => {
        (window as Window & typeof globalThis).cancelIdleCallback(id);
        cancelAnimationFrame(rafId);
        lenisRef.current?.destroy();
        lenisRef.current = null;
      };
    } else {
      const t = setTimeout(init, 300);
      return () => {
        clearTimeout(t);
        cancelAnimationFrame(rafId);
        lenisRef.current?.destroy();
        lenisRef.current = null;
      };
    }
  }, []);

  return <>{children}</>;
}
