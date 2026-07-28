"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AUTH_ROUTES } from "@/features/auth/constants";

interface DemoShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Fixed glass nav + footer chrome shared by every state of the demo flow.
 *
 * The Stitch design shows a signed-in dashboard nav (Dashboard / Proposals /
 * Templates / Analytics + avatar). `/demo-proposal` is public and zero-auth, so
 * this keeps the Stitch geometry and treatment but only ships links that
 * actually resolve.
 */
export function DemoShell({ children, className }: DemoShellProps) {
  return (
    <div
      className={cn(
        "font-[family-name:var(--font-inter)] flex min-h-screen flex-col bg-demo-background text-demo-on-surface",
        className,
      )}
    >
      {/* <nav className="fixed top-0 z-50 w-full border-b border-demo-outline-variant/30 bg-demo-surface/70 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 md:px-10">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-demo-headline-md font-bold tracking-tight text-demo-primary"
            >
              Veltex AI
            </Link>
            <Link
              href="/"
              className="hidden items-center gap-1 text-demo-body-md text-demo-on-surface-variant transition-colors hover:text-demo-primary md:flex"
            >
              <ArrowLeft className="size-4" />
              Back to home
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={AUTH_ROUTES.SIGNUP_FROM_DEMO}
              className="rounded-full bg-demo-primary px-6 py-2 text-demo-label-md font-semibold text-demo-on-primary transition-all hover:opacity-90 active:scale-95"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </nav> */}

      {children}

      {/* <footer className="mt-auto w-full border-t border-demo-outline-variant/20 bg-demo-surface-bright py-8">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-10">
          <div className="flex items-center gap-2">
            <span className="text-demo-label-md font-bold text-demo-primary">
              Veltex AI
            </span>
            <span className="text-demo-body-sm text-demo-outline">
              Precision Proposal Engineering.
            </span>
          </div>
          <div className="flex gap-6">
            <Link
              href="/"
              className="text-demo-body-sm text-demo-outline transition-colors hover:text-demo-on-surface"
            >
              Home
            </Link>
            <Link
              href="/pricing"
              className="text-demo-body-sm text-demo-outline transition-colors hover:text-demo-on-surface"
            >
              Pricing
            </Link>
            <Link
              href={AUTH_ROUTES.LOGIN}
              className="text-demo-body-sm text-demo-outline transition-colors hover:text-demo-on-surface"
            >
              Sign in
            </Link>
          </div>
        </div>
      </footer> */}
    </div>
  );
}
