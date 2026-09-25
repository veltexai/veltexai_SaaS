import type { Organization, OrganizationMember } from "../types/organization";

export const EXAMPLE_CLEANING_ORG_ID = "org-example-cleaning";
export const SAMPLE_FACILITIES_ORG_ID = "org-sample-facilities";

export const FIXTURE_ORGANIZATIONS: Organization[] = [
  {
    id: EXAMPLE_CLEANING_ORG_ID,
    name: "Example Cleaning Co.",
    slug: "example-cleaning-co",
  },
  {
    id: SAMPLE_FACILITIES_ORG_ID,
    name: "Sample Facilities Group",
    slug: "sample-facilities-group",
  },
];

export const FIXTURE_MEMBERS_BY_ORG: Record<string, OrganizationMember[]> = {
  [EXAMPLE_CLEANING_ORG_ID]: [
    {
      id: "member-1",
      organizationId: EXAMPLE_CLEANING_ORG_ID,
      userId: "user-1",
      name: "Ada Example",
      email: "ada.owner@example.test",
      role: "owner",
      status: "active",
      joinedAt: "2026-01-14T09:00:00.000Z",
    },
    {
      id: "member-2",
      organizationId: EXAMPLE_CLEANING_ORG_ID,
      userId: "user-2",
      name: "Blake Example",
      email: "blake.admin@example.test",
      role: "admin",
      status: "active",
      joinedAt: "2026-02-02T14:30:00.000Z",
    },
    {
      id: "member-3",
      organizationId: EXAMPLE_CLEANING_ORG_ID,
      userId: "user-3",
      name: "Casey Example",
      email: "casey.estimator@example.test",
      role: "estimator",
      status: "active",
      joinedAt: "2026-03-11T18:15:00.000Z",
    },
    {
      id: "member-4",
      organizationId: EXAMPLE_CLEANING_ORG_ID,
      userId: null,
      name: "Drew Example",
      email: "drew.estimator@example.test",
      role: "estimator",
      status: "invited",
      invitedAt: "2026-09-20T16:00:00.000Z",
    },
    {
      id: "member-5",
      organizationId: EXAMPLE_CLEANING_ORG_ID,
      userId: "user-5",
      name: "Ellis Example",
      email: "ellis.viewer@example.test",
      role: "viewer",
      status: "active",
      joinedAt: "2026-04-05T12:45:00.000Z",
    },
  ],
  [SAMPLE_FACILITIES_ORG_ID]: [],
};
