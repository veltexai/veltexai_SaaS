import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";
import { Loader2, Send } from "lucide-react";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

interface ProposalStatusActionsProps {
  status: Proposal["status"];
  updating: boolean;
  onSend: () => void;
  onMarkAccepted: () => void;
  onMarkRejected: () => void;
}

export function ProposalStatusActions({
  status,
  updating,
  onSend,
  onMarkAccepted,
  onMarkRejected,
}: ProposalStatusActionsProps) {
  return (
    <>
      {status === "draft" && (
        <Button onClick={onSend} size="sm" className="w-full sm:w-auto">
          <Send className="h-4 w-4 mr-2" />
          Send Proposal
        </Button>
      )}

      {status === "sent" && (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={onSend}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
          >
            <Send className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Send Again</span>
            <span className="sm:hidden">Resend</span>
          </Button>
          <Button
            onClick={onMarkAccepted}
            disabled={updating}
            size="sm"
            className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
          >
            {updating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline">Mark </span>Accepted
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onMarkRejected}
            disabled={updating}
            size="sm"
            className="text-red-600 border-red-600 hover:bg-red-50 flex-1 sm:flex-none"
          >
            {updating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline">Mark </span>Rejected
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );
}
