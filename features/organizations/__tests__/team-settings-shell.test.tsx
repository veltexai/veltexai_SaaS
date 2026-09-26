/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TeamSettingsShell } from "../components/team-settings-shell";
import { createMockTeamAdapter } from "../lib/mock-team-adapter";
import type { TeamAdapter } from "../types/organization";
import { FIXTURE_MEMBERS_BY_ORG, FIXTURE_ORGANIZATIONS } from "../lib/fixtures";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("TeamSettingsShell", () => {
  it("loads organizations and members, then supports inviting a teammate end-to-end (mock demonstration only, invitations explicitly enabled)", async () => {
    const adapter = createMockTeamAdapter({
      latencyMs: 0,
      capabilities: { invitationsEnabled: true },
    });
    render(<TeamSettingsShell adapter={adapter} />);

    // Loading, then the default organization's roster renders. Both the
    // desktop table and the mobile card list are in the DOM simultaneously
    // (CSS toggles which is visible), so scope queries to the table.
    const table = await screen.findByRole("table", { name: "Team members" });
    expect(within(table).getByText("Ada Example")).toBeInTheDocument();

    // Open the invite dialog and submit a new teammate.
    fireEvent.click(screen.getByRole("button", { name: /invite teammate/i }));
    const dialog = await screen.findByRole("dialog", { name: "Invite a teammate" });

    fireEvent.change(
      screen.getByLabelText("Email address"),
      { target: { value: "new.hire@example.com" } },
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /send invite/i }),
      );
    });

    await waitFor(() => {
      expect(dialog).not.toBeInTheDocument();
    });

    expect(within(table).getByText("new.hire")).toBeInTheDocument();
    expect(within(table).queryByText("new.hire@example.com")).not.toBeInTheDocument();
  });

  it("switches the member list when a different organization is selected", async () => {
    const adapter = createMockTeamAdapter({ latencyMs: 0 });
    render(<TeamSettingsShell adapter={adapter} />);

    const initialTable = await screen.findByRole("table", { name: "Team members" });
    expect(within(initialTable).getByText("Ada Example")).toBeInTheDocument();

    fireEvent.keyDown(
      screen.getByRole("button", { name: /current organization/i }),
      { key: "Enter" },
    );
    const otherOrgOption = await screen.findByRole("menuitemradio", {
      name: "Sample Facilities Group",
    });
    fireEvent.click(otherOrgOption);

    // Sample Facilities Group's fixture roster is empty.
    expect(await screen.findByText("No teammates yet")).toBeInTheDocument();
    expect(screen.queryByText("Ada Example")).not.toBeInTheDocument();
  });

  it("shows a neutral member area and a disabled switcher when organizations fail to load", async () => {
    const adapter = createMockTeamAdapter({ latencyMs: 0, scenario: "error" });
    render(<TeamSettingsShell adapter={adapter} />);

    expect(
      await screen.findByText("Couldn't load organizations"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeEnabled();
    expect(screen.getByText("No organization selected")).toBeInTheDocument();
    // Inviting is disabled without a resolvable active organization.
    expect(screen.getByRole("button", { name: /invite teammate/i })).toBeDisabled();
  });

  it("surfaces a retryable error when the member roster itself fails to load", async () => {
    const listMembers = jest
      .fn()
      .mockRejectedValue(new Error("Roster service is down"));
    const adapter: TeamAdapter = {
      listOrganizations: async () => FIXTURE_ORGANIZATIONS,
      getActiveOrganizationId: async () => FIXTURE_ORGANIZATIONS[0]?.id ?? null,
      setActiveOrganizationId: jest.fn(),
      listMembers,
      getCapabilities: async () => ({
        invitationsEnabled: false,
        contactDetailsEnabled: false,
      }),
      inviteMember: jest.fn(),
    };

    render(<TeamSettingsShell adapter={adapter} />);

    expect(
      await screen.findByText("Couldn't load team members"),
    ).toBeInTheDocument();
    expect(screen.getByText("Roster service is down")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => expect(listMembers).toHaveBeenCalledTimes(2));
  });

  it("fails closed by default: explains invitations aren't enabled, never sends one, never adds a roster member", async () => {
    // No `capabilities` override — this is the real production-facing
    // default, which must stay disabled until a real invitation contract
    // ships.
    const adapter = createMockTeamAdapter({ latencyMs: 0 });
    render(<TeamSettingsShell adapter={adapter} />);

    const table = await screen.findByRole("table", { name: "Team members" });
    const initialRowCount = within(table).getAllByRole("row").length;

    const inviteButton = screen.getByRole("button", { name: /invite teammate/i });
    expect(inviteButton).toBeEnabled();
    fireEvent.click(inviteButton);

    expect(
      await screen.findByRole("dialog", {
        name: "Team invitations aren't enabled yet",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^got it$/i }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    // No roster mutation occurred, and focus returns to the trigger.
    expect(within(table).getAllByRole("row")).toHaveLength(initialRowCount);
    expect(inviteButton).toHaveFocus();
  });

  it("returns focus to the invite trigger after cancelling the (enabled) invite dialog", async () => {
    const adapter = createMockTeamAdapter({
      latencyMs: 0,
      capabilities: { invitationsEnabled: true },
    });
    render(<TeamSettingsShell adapter={adapter} />);

    await screen.findByRole("table", { name: "Team members" });

    const inviteButton = screen.getByRole("button", { name: /invite teammate/i });
    inviteButton.focus();
    fireEvent.click(inviteButton);

    await screen.findByRole("dialog", { name: "Invite a teammate" });
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(inviteButton).toHaveFocus();
  });

  it("shows the loading skeleton while a slower network resolves, then the roster", async () => {
    const adapter = createMockTeamAdapter({ latencyMs: 50 });
    render(<TeamSettingsShell adapter={adapter} />);

    // Before the organization itself resolves, there's no active
    // organization yet, so the member area is neutral, not "loading".
    expect(screen.getByText("No organization selected")).toBeInTheDocument();

    // Once the organization resolves, the roster fetch for it begins and
    // is visibly "loading" until it too resolves.
    await waitFor(() => {
      expect(
        screen.getByRole("status", { name: "Loading team members" }),
      ).toBeInTheDocument();
    });

    const table = await screen.findByRole("table", { name: "Team members" });
    expect(within(table).getByText("Ada Example")).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Loading team members" }),
    ).not.toBeInTheDocument();
  });

  it("honors the adapter's persisted active organization instead of always picking the first listed", async () => {
    const adapter = createMockTeamAdapter({
      latencyMs: 0,
      activeOrganizationId: "org-sample-facilities",
    });
    render(<TeamSettingsShell adapter={adapter} />);

    expect(await screen.findByText("No teammates yet")).toBeInTheDocument();
    expect(screen.queryByText("Ada Example")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /current organization/i }),
    ).toHaveTextContent("Sample Facilities Group");
  });

  it("does not change the displayed organization when setActiveOrganizationId rejects", async () => {
    const setActiveOrganizationId = jest
      .fn()
      .mockRejectedValue(new Error("You don't have access to that organization."));
    const adapter: TeamAdapter = {
      listOrganizations: async () => FIXTURE_ORGANIZATIONS,
      getActiveOrganizationId: async () => "org-example-cleaning",
      setActiveOrganizationId,
      listMembers: async (organizationId) =>
        FIXTURE_MEMBERS_BY_ORG[organizationId] ?? [],
      getCapabilities: async () => ({
        invitationsEnabled: false,
        contactDetailsEnabled: false,
      }),
      inviteMember: jest.fn(),
    };

    render(<TeamSettingsShell adapter={adapter} />);

    const table = await screen.findByRole("table", { name: "Team members" });
    expect(within(table).getByText("Ada Example")).toBeInTheDocument();

    fireEvent.keyDown(
      screen.getByRole("button", { name: /current organization/i }),
      { key: "Enter" },
    );
    fireEvent.click(
      await screen.findByRole("menuitemradio", {
        name: "Sample Facilities Group",
      }),
    );

    await waitFor(() => expect(setActiveOrganizationId).toHaveBeenCalled());
    expect(within(table).getByText("Ada Example")).toBeInTheDocument();
    expect(screen.queryByText("No teammates yet")).not.toBeInTheDocument();
    expect(
      await screen.findByText("Couldn't switch organizations"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("You don't have access to that organization."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => expect(setActiveOrganizationId).toHaveBeenCalledTimes(2));
    expect(within(table).getByText("Ada Example")).toBeInTheDocument();
  });

  it("never leaks fixture roster or organization names when adapter reads fail", async () => {
    const listMembers = jest
      .fn()
      .mockResolvedValue(FIXTURE_MEMBERS_BY_ORG["org-example-cleaning"]);
    const inviteMember = jest.fn();
    const adapter: TeamAdapter = {
      listOrganizations: async () => {
        throw new Error("Team management isn't available yet. Check back soon.");
      },
      getActiveOrganizationId: async () => "org-example-cleaning",
      setActiveOrganizationId: jest.fn(),
      listMembers,
      getCapabilities: async () => ({
        invitationsEnabled: true,
        contactDetailsEnabled: false,
      }),
      inviteMember,
    };

    render(<TeamSettingsShell adapter={adapter} />);

    expect(
      await screen.findByText("Couldn't load organizations"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeEnabled();
    expect(screen.getByText("No organization selected")).toBeInTheDocument();
    expect(screen.queryByText("Ada Example")).not.toBeInTheDocument();
    expect(screen.queryByText("Blake Example")).not.toBeInTheDocument();
    expect(screen.queryByText("Example Cleaning Co.")).not.toBeInTheDocument();
    expect(screen.queryByText("Sample Facilities Group")).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Team members" })).not.toBeInTheDocument();
    expect(listMembers).not.toHaveBeenCalled();
    expect(inviteMember).not.toHaveBeenCalled();
  });

  it("fails closed by default with no adapter prop at all — never falls back to fixture/mock data", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error("network unavailable"));
    render(<TeamSettingsShell />);

    expect(
      await screen.findByText("Couldn't load organizations"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeEnabled();
    expect(screen.getByText("No organization selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /invite teammate/i })).toBeDisabled();

    // Proves no fixture data ever rendered: none of the known fixture
    // organization/member names appear anywhere in the document.
    expect(screen.queryByText("Ada Example")).not.toBeInTheDocument();
    expect(screen.queryByText("Blake Example")).not.toBeInTheDocument();
    expect(screen.queryByText("Example Cleaning Co.")).not.toBeInTheDocument();
    expect(screen.queryByText("Sample Facilities Group")).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Team members" })).not.toBeInTheDocument();
    global.fetch = originalFetch;
  });

  it("does not show member emails for viewer/estimator-shaped capabilities", async () => {
    const adapter = createMockTeamAdapter({
      latencyMs: 0,
      capabilities: {
        invitationsEnabled: false,
        contactDetailsEnabled: false,
      },
    });
    render(<TeamSettingsShell adapter={adapter} />);

    const table = await screen.findByRole("table", { name: "Team members" });
    expect(within(table).getByText("Casey Example")).toBeInTheDocument();
    expect(within(table).getByText("Ellis Example")).toBeInTheDocument();
    expect(screen.queryByText("casey.estimator@example.test")).not.toBeInTheDocument();
    expect(screen.queryByText("ellis.viewer@example.test")).not.toBeInTheDocument();
    expect(screen.queryByText("ada.owner@example.test")).not.toBeInTheDocument();
  });

  it("renders emails only after an authorized contact-detail capability is confirmed", async () => {
    const adapter = createMockTeamAdapter({
      latencyMs: 0,
      capabilities: {
        invitationsEnabled: false,
        contactDetailsEnabled: true,
      },
    });
    render(<TeamSettingsShell adapter={adapter} />);

    const table = await screen.findByRole("table", { name: "Team members" });
    expect(within(table).getByText("ada.owner@example.test")).toBeInTheDocument();
  });

  it("retries a failed organization load without rendering fixtures first", async () => {
    const listOrganizations = jest
      .fn()
      .mockRejectedValueOnce(new Error("Load failed"))
      .mockResolvedValueOnce(FIXTURE_ORGANIZATIONS);
    const adapter: TeamAdapter = {
      listOrganizations,
      getActiveOrganizationId: async () => null,
      setActiveOrganizationId: jest.fn(),
      listMembers: async () => [],
      getCapabilities: async () => ({
        invitationsEnabled: false,
        contactDetailsEnabled: false,
      }),
      inviteMember: jest.fn(),
    };

    render(<TeamSettingsShell adapter={adapter} />);

    expect(await screen.findByText("Couldn't load organizations")).toBeInTheDocument();
    expect(screen.queryByText("Example Cleaning Co.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(
      await screen.findByRole("button", { name: /current organization/i }),
    ).toHaveTextContent("Example Cleaning Co.");
    expect(listOrganizations).toHaveBeenCalledTimes(2);
  });
});
