"use client";

import { useMemo, useRef, useState, type MouseEvent } from "react";
import { RefreshCw, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createServerTeamAdapter } from "../lib/server-team-adapter";
import { useOrganizations } from "../hooks/use-organizations";
import { useTeamMembers } from "../hooks/use-team-members";
import { useInviteMember } from "../hooks/use-invite-member";
import { useTeamCapabilities } from "../hooks/use-team-capabilities";
import { OrganizationSwitcher } from "./organization-switcher";
import { MemberList } from "./member-list";
import { InviteMemberDialog } from "./invite-member-dialog";
import type { TeamAdapter } from "../types/organization";
import type { InviteMemberFormValues } from "../schemas/invite-member";

export interface TeamSettingsShellProps {
  /**
   * Injectable for tests/stories/an explicit development-only preview
   * (see `features/organizations/lib/resolve-team-adapter.ts`, used by the
   * production page). If omitted, this shell defaults to
   * the authenticated server adapter — **never** the mock. Server and network
   * failures reject into the existing fail-closed error states.
   */
  adapter?: TeamAdapter;
}

/**
 * Responsive organization/team settings shell.
 *
 * This is a self-contained UI feature: it never calls a live endpoint or
 * fabricates data itself. It renders whatever `adapter` it is given and
 * fails closed by default. See
 * docs/product/platform-build/CURSOR_R2_CONTRACT_REQUEST.md for the exact
 * server contract this shell expects once an accepted adapter exists, and
 * `resolve-team-adapter.ts` for how the mock stays development/test-only.
 */
export function TeamSettingsShell({ adapter: adapterProp }: TeamSettingsShellProps) {
  const adapter = useMemo(
    () => adapterProp ?? createServerTeamAdapter(),
    // Intentionally created once per shell instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const {
    status: orgStatus,
    organizations,
    error: orgError,
    switchError,
    activeOrganizationId,
    setActiveOrganizationId,
    reload: reloadOrganizations,
    retryFailedSwitch,
  } = useOrganizations(adapter);

  const {
    status: membersStatus,
    members,
    error: membersError,
    reload: reloadMembers,
    addMember,
  } = useTeamMembers(adapter, activeOrganizationId);

  const {
    status: inviteStatus,
    error: inviteError,
    invite,
    reset: resetInvite,
  } = useInviteMember(adapter);

  const { status: capabilitiesStatus, capabilities } =
    useTeamCapabilities(adapter);

  // Fail closed: only a confirmed, successfully-loaded `true` counts as
  // enabled. Loading, error, or any other state is treated as disabled so
  // the invite form is never shown before the capability is confirmed.
  const invitationsEnabled =
    capabilitiesStatus === "success" && capabilities?.invitationsEnabled === true;
  const contactDetailsEnabled =
    capabilitiesStatus === "success" &&
    capabilities?.contactDetailsEnabled === true;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // Explicit focus restoration: whichever element opened the dialog
  // (header button or the member list's empty-state CTA) regains focus
  // once it closes. This dialog is opened from more than one trigger, so
  // we track the exact element ourselves and hook into Radix's
  // `onCloseAutoFocus` (see InviteMemberDialog) rather than depending on
  // its default "return focus to whatever was previously focused"
  // behavior, which is not guaranteed across multiple triggers.
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  function openInviteDialog(event: MouseEvent<HTMLButtonElement>) {
    // Capture the exact trigger via the click event rather than
    // `document.activeElement`: a real click doesn't always leave the
    // clicked element focused in every environment, but its
    // `currentTarget` is always the trigger itself.
    lastFocusedElementRef.current = event.currentTarget;
    resetInvite();
    setInviteOpen(true);
  }

  const activeOrganizationName = organizations.find(
    (org) => org.id === activeOrganizationId,
  )?.name;

  async function handleInvite(values: InviteMemberFormValues): Promise<boolean> {
    if (!activeOrganizationId || !invitationsEnabled) return false;

    const result = await invite({
      organizationId: activeOrganizationId,
      email: values.email,
      role: values.role,
    });

    if (result) {
      addMember(result.member);
      const message =
        "Local preview only. No invitation email was sent.";
      toast.success(message);
      setAnnouncement(message);
      return true;
    }

    return false;
  }

  // Only gated on org context being ready. Whether invitations are actually
  // enabled is decided inside the dialog itself (fail-closed), so clicking
  // this button always explains the real state rather than being a
  // silently-disabled dead end.
  const canOpenInviteDialog =
    Boolean(activeOrganizationId) && orgStatus === "success";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Team
          </h1>
          <p className="mt-1 text-sm text-gray-600 sm:text-base">
            Manage who has access to{" "}
            {activeOrganizationName ?? "your organization"} and what they can
            do.
          </p>
        </div>

        <Button
          onClick={openInviteDialog}
          disabled={!canOpenInviteDialog}
          aria-describedby={
            !canOpenInviteDialog ? "invite-teammate-unavailable" : undefined
          }
          className="w-full sm:w-auto"
        >
          <UserPlus />
          Invite teammate
        </Button>
        {!canOpenInviteDialog ? (
          <span id="invite-teammate-unavailable" className="sr-only">
            Select an organization before inviting a teammate.
          </span>
        ) : null}
      </div>

      {/* Screen-reader-only live status announcer, independent of any toast
          library implementation detail. */}
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-gray-700" id="org-switcher-label">
          Organization
        </span>
        <OrganizationSwitcher
          organizations={organizations}
          activeOrganizationId={activeOrganizationId}
          onChange={setActiveOrganizationId}
          status={orgStatus}
          error={orgError}
          onRetry={reloadOrganizations}
          className="w-full sm:w-auto"
        />
      </div>

      {switchError ? (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t switch organizations</AlertTitle>
          <AlertDescription>
            <p className="mb-3">{switchError}</p>
            <Button
              type="button"
              onClick={retryFailedSwitch}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <MemberList
        members={members}
        status={membersStatus}
        error={membersError}
        onReload={reloadMembers}
        onInviteClick={openInviteDialog}
        showContactDetails={contactDetailsEnabled}
      />

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmit={handleInvite}
        status={inviteStatus}
        error={inviteError}
        invitationsEnabled={invitationsEnabled}
        onAfterClose={() => lastFocusedElementRef.current?.focus()}
      />
    </div>
  );
}
