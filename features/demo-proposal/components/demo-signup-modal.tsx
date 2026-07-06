"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/features/auth/constants";

interface DemoSignupModalProps {
  open: boolean;
  onClose: () => void;
}

export function DemoSignupModal({ open, onClose }: DemoSignupModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            Create your free account
          </DialogTitle>
          <DialogDescription className="text-center mt-1">
            Save, download, and send real proposals with your company branding
            and client details — no credit card required.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-2">
          <Link href={AUTH_ROUTES.SIGNUP_FROM_DEMO} onClick={onClose}>
            <Button
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Sign Up Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href={AUTH_ROUTES.LOGIN} onClick={onClose}>
            <Button size="lg" variant="outline" className="w-full">
              I already have an account
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          7-day free trial · 3 proposals · No credit card required
        </p>
      </DialogContent>
    </Dialog>
  );
}
