"use client";

import { FileText, Save, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface DemoActionsProps {
  /**
   * Every action is gated — the parent owns the single `DemoSignupModal`
   * instance and opens it from here.
   */
  onAction: () => void;
  className?: string;
}

/**
 * Gated action stack from the Stitch "Final Conversion CTA" sidebar.
 * Save / Download / Send never perform real operations in the demo.
 */
export function DemoActions({ onAction, className }: DemoActionsProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <button
        type="button"
        onClick={onAction}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-demo-primary py-4 font-bold text-demo-on-primary shadow-lg transition-all hover:bg-demo-surface-tint active:scale-[0.98]"
      >
        <Send className="size-5" />
        Send Proposal
      </button>

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onAction}
          className="flex items-center justify-center gap-2 rounded-xl bg-demo-secondary py-3 font-semibold text-demo-on-secondary transition-all hover:opacity-90 active:scale-95"
        >
          <Save className="size-5" />
          Save
        </button>
        <button
          type="button"
          onClick={onAction}
          className="flex items-center justify-center gap-2 rounded-xl bg-demo-surface-container-high py-3 font-semibold text-demo-on-surface transition-all hover:bg-demo-surface-dim active:scale-95"
        >
          <FileText className="size-5" />
          PDF
        </button>
      </div>
    </div>
  );
}
