import type { Organization, OrganizationMember } from "../types/organization";

export const FIXTURE_ORGANIZATIONS: Organization[] = [
  { id: "org-veltex-cleaning", name: "Veltex Cleaning Co.", slug: "veltex-cleaning-co" },
  { id: "org-summit-facilities", name: "Summit Facilities Group", slug: "summit-facilities-group" },
];

export const FIXTURE_MEMBERS_BY_ORG: Record<string, OrganizationMember[]> = {
  "org-veltex-cleaning": [
    {
      id: "member-1",
      organizationId: "org-veltex-cleaning",
      userId: "user-1",
      name: "Anthony Veliz",
      email: "anthony@veltexclean.com",
      role: "owner",
      status: "active",
      joinedAt: "2026-01-14T09:00:00.000Z",
    },
    {
      id: "member-2",
      organizationId: "org-veltex-cleaning",
      userId: "user-2",
      name: "Jordan Rivera",
      email: "jordan@veltexclean.com",
      role: "admin",
      status: "active",
      joinedAt: "2026-02-02T14:30:00.000Z",
    },
    {
      id: "member-3",
      organizationId: "org-veltex-cleaning",
      userId: "user-3",
      name: "Casey Tran",
      email: "casey@veltexclean.com",
      role: "estimator",
      status: "active",
      joinedAt: "2026-03-11T18:15:00.000Z",
    },
    {
      id: "member-4",
      organizationId: "org-veltex-cleaning",
      userId: null,
      name: "Morgan Blake",
      email: "morgan@veltexclean.com",
      role: "estimator",
      status: "invited",
      invitedAt: "2026-09-20T16:00:00.000Z",
    },
    {
      id: "member-5",
      organizationId: "org-veltex-cleaning",
      userId: "user-5",
      name: "Sam Ortiz",
      email: "sam@veltexclean.com",
      role: "viewer",
      status: "active",
      joinedAt: "2026-04-05T12:45:00.000Z",
    },
  ],
  // A freshly created organization with no teammates yet — demonstrates the
  // empty state without simulating a defensive/error data gap.
  "org-summit-facilities": [],
};
