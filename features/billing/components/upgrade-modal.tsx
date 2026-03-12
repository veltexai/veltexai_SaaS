"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UPGRADE_BENEFITS = [
  "Unlimited proposals",
  "Send proposals to clients",
  "Download PDF proposals",
] as const;

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push("/dashboard/billing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-xl text-center">
            Upgrade to unlock
          </DialogTitle>
          <DialogDescription className="text-center">
            Subscribe to a plan to access all features.
          </DialogDescription>
        </DialogHeader>

        <ul className="my-4 space-y-3">
          {UPGRADE_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {benefit}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            View Plans
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
