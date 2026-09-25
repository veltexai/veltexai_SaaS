"use client";

import { useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createMockTeamAdapter, type MockTeamAdapterOptions } from "../lib/mock-team-adapter";
import { useOrganizations } from "../hooks/use-organizations";
import { useTeamMembers } from "../hooks/use-team-members";
import { useInviteMember } from "../hooks/use-invite-member";
import { OrganizationSwitcher } from "./organization-switcher";
import { MemberList } from "./member-list";
import { InviteMemberDialog } from "./invite-member-dialog";
import type { TeamAdapter } from "../types/organization";
import type { InviteMemberFormValues } from "../schemas/invite-member";

export interface TeamSettingsShellProps {
  /** Injectable for tests/stories; defaults to the local mock adapter. */
  adapter?: TeamAdapter;
  /** Convenience for demonstrating scenarios without wiring a custom adapter. */
  mockOptions?: MockTeamAdapterOptions;
}

/**
 * Responsive organization/team settings shell.
 *
 * This is a self-contained UI feature: it owns its own mocked data adapter
 * and does not call any live endpoint. See
 * docs/product/platform-build/CURSOR_R2_CONTRACT_REQUEST.md for the exact
 * server contract this shell expects once Codex's R2 API is available.
 */
export function TeamSettingsShell({
  adapter: adapterProp,
  mockOptions,
}: TeamSettingsShellProps) {
  const adapter = useMemo(
    () => adapterProp ?? createMockTeamAdapter(mockOptions),
    // Intentionally created once per shell instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const {
    status: orgStatus,
    organizations,
    activeOrganizationId,
    setActiveOrganizationId,
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

  const [inviteOpen, setInviteOpen] = useState(false);

  const activeOrganizationName = organizations.find(
    (org) => org.id === activeOrganizationId,
  )?.name;

  async function handleInvite(values: InviteMemberFormValues): Promise<boolean> {
    if (!activeOrganizationId) return false;

    const result = await invite({
      organizationId: activeOrganizationId,
      email: values.email,
      role: values.role,
    });

    if (result) {
      addMember(result.member);
      toast.success(`Invite sent to ${result.member.email}`);
      return true;
    }

    return false;
  }

  const canInvite = Boolean(activeOrganizationId) && orgStatus === "success";

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
          onClick={() => {
            resetInvite();
            setInviteOpen(true);
          }}
          disabled={!canInvite}
          className="w-full sm:w-auto"
        >
          <UserPlus />
          Invite teammate
        </Button>
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
          className="w-full sm:w-auto"
        />
      </div>

      <MemberList
        members={members}
        status={membersStatus}
        error={membersError}
        onReload={reloadMembers}
        onInviteClick={() => {
          resetInvite();
          setInviteOpen(true);
        }}
      />

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmit={handleInvite}
        status={inviteStatus}
        error={inviteError}
      />
    </div>
  );
}
