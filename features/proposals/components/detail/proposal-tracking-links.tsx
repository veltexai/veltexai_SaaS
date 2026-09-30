"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Ban, Link2, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrackingLink {
  id: string;
  recipient_email: string;
  delivery_method: string;
  email_sent_at: string | null;
  created_at: string;
  view_count: number | null;
  download_count: number | null;
  revoked_at: string | null;
}

export function ProposalTrackingLinks({ proposalId }: { proposalId: string }) {
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [canRevoke, setCanRevoke] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/proposals/${proposalId}/tracking-links`);
      if (!response.ok) throw new Error("Unable to load delivery links");
      const payload = (await response.json()) as {
        links: TrackingLink[];
        canRevoke: boolean;
      };
      setLinks(payload.links);
      setCanRevoke(payload.canRevoke);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load delivery links");
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (link: TrackingLink) => {
    if (
      !window.confirm(
        `Revoke the proposal link sent to ${link.recipient_email}? The recipient will no longer be able to view or download it. This cannot be undone.`,
      )
    ) {
      return;
    }

    setBusyId(link.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/proposals/${proposalId}/tracking-links/${link.id}/revoke`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      );
      if (!response.ok) throw new Error("The delivery link could not be revoked");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The delivery link could not be revoked");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Delivery links
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Revoke an online proposal link without deleting its delivery history.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {loading && links.length === 0 ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading delivery links…
          </div>
        ) : links.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">No tracked links have been sent.</p>
        ) : (
          links.map((link) => (
            <div key={link.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{link.recipient_email}</p>
                  {link.revoked_at ? <Badge variant="destructive">Revoked</Badge> : <Badge variant="outline">Active</Badge>}
                  <Badge variant="secondary">{link.delivery_method.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sent {formatDistanceToNow(new Date(link.email_sent_at ?? link.created_at), { addSuffix: true })}
                  {link.revoked_at
                    ? ` · Revoked ${formatDistanceToNow(new Date(link.revoked_at), { addSuffix: true })}`
                    : ` · ${link.view_count ?? 0} views · ${link.download_count ?? 0} downloads`}
                </p>
              </div>
              {canRevoke && !link.revoked_at ? (
                <Button variant="destructive" size="sm" onClick={() => void revoke(link)} disabled={busyId === link.id}>
                  {busyId === link.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                  Revoke link
                </Button>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
