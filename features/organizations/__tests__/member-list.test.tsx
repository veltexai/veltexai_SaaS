/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemberList } from "../components/member-list";
import type { OrganizationMember } from "../types/organization";

const members: OrganizationMember[] = [
  {
    id: "m1",
    organizationId: "org-1",
    userId: "u1",
    name: "Ada Example",
    email: "ada.owner@example.test",
    role: "owner",
    status: "active",
    joinedAt: "2026-01-14T09:00:00.000Z",
  },
  {
    id: "m2",
    organizationId: "org-1",
    userId: null,
    name: "Drew Example",
    email: "drew.estimator@example.test",
    role: "estimator",
    status: "invited",
    invitedAt: "2026-09-20T16:00:00.000Z",
  },
];

function renderList(
  overrides: Partial<React.ComponentProps<typeof MemberList>> = {},
) {
  const onReload = jest.fn();
  const onInviteClick = jest.fn();

  render(
    <MemberList
      members={members}
      status="success"
      error={null}
      onReload={onReload}
      onInviteClick={onInviteClick}
      {...overrides}
    />,
  );

  return { onReload, onInviteClick };
}

describe("MemberList", () => {
  it("shows a neutral idle state when there is no organization to load yet", () => {
    renderList({ status: "idle" });
    expect(screen.getByText("No organization selected")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows an accessible loading state", () => {
    renderList({ status: "loading" });
    expect(
      screen.getByRole("status", { name: "Loading team members" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows a retryable error state", () => {
    const { onReload } = renderList({
      status: "error",
      error: "Network unreachable",
    });

    expect(screen.getByText("Network unreachable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state with an invite call-to-action", () => {
    const { onInviteClick } = renderList({ members: [], status: "success" });

    expect(screen.getByText("No teammates yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /invite a teammate/i }));
    expect(onInviteClick).toHaveBeenCalledTimes(1);
  });

  it("renders both a desktop table and a mobile list with the same members", () => {
    renderList();

    const table = screen.getByRole("table", { name: "Team members" });
    const mobileList = screen.getByRole("list", { name: "Team members" });

    for (const container of [table, mobileList]) {
      expect(within(container).getByText("Ada Example")).toBeInTheDocument();
      expect(within(container).getByText("Drew Example")).toBeInTheDocument();
      expect(within(container).getByText("Owner")).toBeInTheDocument();
      expect(within(container).getByText("Estimator")).toBeInTheDocument();
      expect(within(container).getByText("Invited")).toBeInTheDocument();
    }
  });

  it("truncates a very long member name/email but preserves the full text via title", () => {
    const longName = "Bartholomew Alexander Montgomery-Fitzgerald III";
    const longEmail = "bartholomew.alexander.montgomery-fitzgerald@example-enterprise-domain.com";

    renderList({
      showContactDetails: true,
      members: [
        {
          id: "m-long",
          organizationId: "org-1",
          userId: "u-long",
          name: longName,
          email: longEmail,
          role: "viewer",
          status: "active",
          joinedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const nameNodes = screen.getAllByText(longName);
    const emailNodes = screen.getAllByText(longEmail);
    // Present once for the desktop table and once for the mobile list.
    expect(nameNodes.length).toBeGreaterThanOrEqual(2);
    expect(emailNodes.length).toBeGreaterThanOrEqual(2);
    for (const node of nameNodes) {
      expect(node).toHaveClass("truncate");
      expect(node).toHaveAttribute("title", longName);
    }
    for (const node of emailNodes) {
      expect(node).toHaveClass("truncate");
      expect(node).toHaveAttribute("title", longEmail);
    }
  });

  it("keeps the desktop table hidden below the sm breakpoint and the mobile list hidden at/above it", () => {
    renderList();

    const table = screen.getByRole("table", { name: "Team members" });
    const mobileList = screen.getByRole("list", { name: "Team members" });

    // Desktop table's wrapper is hidden by default and only shown at `sm:`+.
    expect(table.closest("div.hidden")).toHaveClass("sm:block");
    // Mobile list is visible by default and hidden at `sm:`+.
    expect(mobileList).toHaveClass("sm:hidden");
  });

  it("does not render emails unless an authorized contact-detail projection is enabled", () => {
    renderList();
    expect(screen.queryByText("ada.owner@example.test")).not.toBeInTheDocument();
    expect(screen.queryByText("drew.estimator@example.test")).not.toBeInTheDocument();
  });

  it("renders emails only when showContactDetails is true and a value is supplied", () => {
    renderList({ showContactDetails: true });
    expect(screen.getAllByText("ada.owner@example.test").length).toBeGreaterThanOrEqual(2);
  });

  it("still hides missing emails even when contact details are enabled", () => {
    renderList({
      showContactDetails: true,
      members: [
        {
          id: "m-redacted",
          organizationId: "org-1",
          userId: "u-redacted",
          name: "Redacted Example",
          role: "viewer",
          status: "active",
        },
      ],
    });

    expect(screen.getAllByText("Redacted Example").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });
});
