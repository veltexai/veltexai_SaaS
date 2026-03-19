import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SendProgressAlertProps {
  message: string;
}

export function SendProgressAlert({ message }: SendProgressAlertProps) {
  return (
    <Alert
      role="status"
      aria-live="polite"
      aria-label="Sending progress"
      className="border-blue-200 bg-blue-50"
    >
      <Loader2
        className="h-4 w-4 animate-spin text-blue-600"
        aria-hidden="true"
      />
      <AlertDescription className="text-blue-800 ml-2">
        {message}
      </AlertDescription>
    </Alert>
  );
}
