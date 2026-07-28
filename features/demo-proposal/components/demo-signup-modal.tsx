"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AUTH_ROUTES } from "@/features/auth/constants";
import { signInWithGoogle } from "@/features/auth/actions/oauth";

const TRUST_POINTS = ["No credit card", "Unlimited drafts"];

interface DemoSignupModalProps {
  open: boolean;
  onClose: () => void;
}

export function DemoSignupModal({ open, onClose }: DemoSignupModalProps) {
  const [isPending, startTransition] = useTransition();
  const [redirecting, setRedirecting] = useState(false);

  const handleGoogle = () => {
    startTransition(async () => {
      const result = await signInWithGoogle(
        undefined,
        AUTH_ROUTES.QUICK_PROPOSAL,
        "signup",
      );

      if (result.data?.url) {
        setRedirecting(true);
        window.location.href = result.data.url;
        return;
      }

      toast.error(
        result.error?.message ?? "Could not start Google sign-in. Try again.",
      );
    });
  };

  const busy = isPending || redirecting;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg gap-0 rounded-3xl border-none bg-demo-surface p-8 text-center font-[family-name:var(--font-inter)] shadow-2xl sm:max-w-lg">
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-demo-primary/10 text-demo-primary">
          <PartyPopper className="size-10" />
        </div>

        <DialogTitle className="mb-2 text-demo-display-sm text-demo-on-surface">
          Your proposal is ready 🎉
        </DialogTitle>
        <p className="mb-8 text-demo-body-md text-demo-on-surface-variant">
          Create a free account to unlock saving, sending and high-quality PDF
          downloads with your own branding.
        </p>

        <div className="mb-8 space-y-4">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-demo-primary py-4 font-bold text-demo-on-primary transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          <Link
            href={AUTH_ROUTES.SIGNUP_FROM_DEMO}
            onClick={onClose}
            className="block w-full rounded-xl bg-demo-on-surface py-4 font-bold text-demo-surface transition-all hover:opacity-90"
          >
            Sign up with Email
          </Link>

          <Link
            href={AUTH_ROUTES.LOGIN}
            onClick={onClose}
            className="block text-demo-body-sm text-demo-on-surface-variant underline-offset-4 hover:underline"
          >
            I already have an account
          </Link>
        </div>

        <div className="flex items-center justify-center gap-6 text-demo-outline">
          {TRUST_POINTS.map((point) => (
            <div key={point} className="flex items-center gap-1">
              <Check className="size-3.5" />
              <span className="text-[12px]">{point}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="currentColor"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="currentColor"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="currentColor"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="currentColor"
      />
    </svg>
  );
}
