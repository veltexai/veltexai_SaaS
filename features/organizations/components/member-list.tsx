"use client";

import { RefreshCw, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MemberAvatar } from "./member-avatar";
import { RoleBadge } from "./role-badge";
import type { OrganizationMember } from "../types/organization";

interface MemberListProps {
  members: OrganizationMember[];
  status: "idle" | "loading" | "error" | "success";
  error: string | null;
  onReload: () => void;
  onInviteClick: () => void;
}

const SKELETON_ROW_COUNT = 3;

function StatusPill({ status }: { status: OrganizationMember["status"] }) {
  return status === "invited" ? (
    <Badge variant="outline" className="text-muted-foreground">
      Invited
    </Badge>
  ) : (
    <Badge variant="outline" className="border-green-600 text-green-700">
      Active
    </Badge>
  );
}

function MemberListLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading team members">
      {/* Desktop skeleton */}
      <div className="hidden sm:block space-y-3">
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
      {/* Mobile skeleton */}
      <div className="sm:hidden space-y-3">
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-lg border p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading team members…</span>
    </div>
  );
}

function MemberListError({
  error,
  onReload,
}: {
  error: string | null;
  onReload: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Couldn&apos;t load team members</AlertTitle>
      <AlertDescription>
        <p className="mb-3">
          {error ?? "Something went wrong while loading your team."}
        </p>
        <Button onClick={onReload} variant="outline" size="sm">
          <RefreshCw className="mr-2" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function MemberListIdle() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
      <Users className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="font-medium">No organization selected</p>
        <p className="text-sm text-muted-foreground">
          Choose an organization above to see its team.
        </p>
      </div>
    </div>
  );
}

function MemberListEmpty({ onInviteClick }: { onInviteClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
      <Users className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="font-medium">No teammates yet</p>
        <p className="text-sm text-muted-foreground">
          Invite your first teammate to start collaborating on proposals.
        </p>
      </div>
      <Button onClick={onInviteClick}>Invite a teammate</Button>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export function MemberList({
  members,
  status,
  error,
  onReload,
  onInviteClick,
}: MemberListProps) {
  if (status === "idle") {
    return <MemberListIdle />;
  }

  if (status === "loading") {
    return <MemberListLoading />;
  }

  if (status === "error") {
    return <MemberListError error={error} onReload={onReload} />;
  }

  if (members.length === 0) {
    return <MemberListEmpty onInviteClick={onInviteClick} />;
  }

  return (
    <div>
      {/* Desktop: table */}
      <div className="hidden sm:block rounded-lg border">
        <Table aria-label="Team members">
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Since</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <MemberAvatar
                      name={member.name}
                      email={member.email}
                      avatarUrl={member.avatarUrl}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium leading-none">
                        {member.name}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <RoleBadge role={member.role} />
                </TableCell>
                <TableCell>
                  <StatusPill status={member.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(member.joinedAt ?? member.invitedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="sm:hidden space-y-3" aria-label="Team members">
        {members.map((member) => (
          <li key={member.id} className="rounded-lg border p-3">
            <div className="flex items-start gap-3">
              <MemberAvatar
                name={member.name}
                email={member.email}
                avatarUrl={member.avatarUrl}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium leading-none">
                  {member.name}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {member.email}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <RoleBadge role={member.role} />
                  <StatusPill status={member.status} />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
