"use client";

import { useState } from "react";
import { Download, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoSignupModal } from "./demo-signup-modal";

export function DemoActions() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
        >
          <Save className="h-4 w-4" />
          Save Proposal
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
        >
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setModalOpen(true)}
        >
          <Send className="h-4 w-4" />
          Send Proposal
        </Button>
      </div>

      <DemoSignupModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
