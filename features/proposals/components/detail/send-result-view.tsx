import { CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SendResult } from "../../types/send-result";

interface SendResultViewProps {
  result: SendResult;
  onSendAnother: () => void;
  onClose: () => void;
}

export function SendResultView({
  result,
  onSendAnother,
  onClose,
}: SendResultViewProps) {
  return (
    <div className="space-y-4">
      <ResultAlert result={result} />

      {/* Only rendered when result.success === true (TypeScript narrows) */}
      {result.success && result.trackingId && (
        <TrackingInfoCard trackingId={result.trackingId} />
      )}

      <div className="flex justify-end gap-2">
        {result.success ? (
          <>
            <Button variant="outline" onClick={onSendAnother}>
              Send Another
            </Button>
            <Button onClick={onClose}>Close</Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSendAnother}>Try Again</Button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components (private to this file) ────────────────────────────────────

function ResultAlert({ result }: { result: SendResult }) {
  return (
    <Alert
      role="status"
      aria-live="polite"
      className={
        result.success
          ? "border-green-200 bg-green-50"
          : "border-red-200 bg-red-50"
      }
    >
      <div className="flex items-start gap-2">
        {result.success ? (
          <CheckCircle
            className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0"
            aria-hidden="true"
          />
        ) : (
          <AlertCircle
            className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0"
            aria-hidden="true"
          />
        )}
        <div className="flex-1 space-y-1">
          <AlertDescription
            className={
              result.success ? "text-green-800" : "text-red-800 font-medium"
            }
          >
            {result.message}
          </AlertDescription>

          {/* Narrowed: these fields only exist on SendResultFailure */}
          {!result.success && (
            <>
              <p className="text-xs text-red-600">
                Error Code: {result.errorCode}
              </p>
              {result.errorDetails && (
                <p className="text-xs text-red-500 mt-1">
                  Details:{" "}
                  {typeof result.errorDetails === "string"
                    ? result.errorDetails
                    : JSON.stringify(result.errorDetails)}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </Alert>
  );
}

function TrackingInfoCard({ trackingId }: { trackingId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Tracking Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tracking ID:</span>
            <Badge variant="outline">{trackingId}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-500" aria-hidden="true" />
              <span className="text-blue-600">Sent</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
