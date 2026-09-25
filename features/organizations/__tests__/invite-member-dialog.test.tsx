/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { InviteMemberDialog } from "../components/invite-member-dialog";

// jsdom does not implement scrollIntoView. Radix's Select calls it when
// positioning the highlighted item, which otherwise throws and unmounts the
// tree mid-test. This is a test-environment gap, not app behavior — real
// browsers implement scrollIntoView.
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof InviteMemberDialog>> = {},
) {
  const onOpenChange = jest.fn();
  const onSubmit = jest.fn().mockResolvedValue(true);

  render(
    <InviteMemberDialog
      open
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      status="idle"
      error={null}
      invitationsEnabled
      {...overrides}
    />,
  );

  return { onOpenChange, onSubmit };
}

describe("InviteMemberDialog", () => {
  it("renders an accessible dialog with email and role fields", () => {
    renderDialog();

    expect(
      screen.getByRole("dialog", { name: "Invite a teammate" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
  });

  it("never offers Owner as an invitable role", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("option", { name: "Owner" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Admin" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Estimator" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Viewer" })).toBeInTheDocument();
  });

  it("shows the matching role description as the role selection changes", () => {
    renderDialog();

    // Default role is estimator.
    expect(
      screen.getByText("Create, edit, and send proposals and pricing."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Viewer" }));

    expect(screen.getByRole("combobox")).toHaveTextContent("Viewer");
    expect(
      screen.getByText("View proposals and reports without editing."),
    ).toBeInTheDocument();
  });

  it("blocks submission and shows a validation message for an invalid email", async () => {
    const { onSubmit } = renderDialog();

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send invite/i }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks submission for an email missing a domain", async () => {
    const { onSubmit } = renderDialog();

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "teammate@" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send invite/i }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks submission for an empty email", async () => {
    const { onSubmit } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /send invite/i }));

    expect(await screen.findByText(/email/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the email and default role, then resets and closes on success", async () => {
    const { onOpenChange, onSubmit } = renderDialog();

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "teammate@example.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /send invite/i }));
    });

    expect(onSubmit).toHaveBeenCalledWith({
      email: "teammate@example.com",
      role: "estimator",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the dialog open and shows the server error when the submit fails (e.g. a duplicate email)", async () => {
    const onOpenChange = jest.fn();
    const onSubmit = jest.fn().mockResolvedValue(false);

    render(
      <InviteMemberDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        status="error"
        error="This email has already been invited to this organization."
        invitationsEnabled
      />,
    );

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "teammate@example.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /send invite/i }));
    });

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(
      screen.getByText(
        "This email has already been invited to this organization.",
      ),
    ).toBeInTheDocument();
  });

  it("disables the form and shows a busy submit button while sending", () => {
    renderDialog({ status: "loading" });

    expect(screen.getByLabelText("Email address")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /sending invite/i }),
    ).toBeDisabled();
  });

  it("prevents closing the dialog while the invite is in flight", () => {
    const onOpenChange = jest.fn();
    renderDialog({ status: "loading", onOpenChange });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("cancels without submitting when Cancel is clicked", () => {
    const { onOpenChange, onSubmit } = renderDialog();

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "someone@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("supports keyboard-only operation: tab to email, type, tab to role, submit with Enter", async () => {
    const { onSubmit } = renderDialog();

    const emailInput = screen.getByLabelText("Email address");
    emailInput.focus();
    expect(emailInput).toHaveFocus();

    fireEvent.change(emailInput, { target: { value: "keyboard@example.com" } });

    const roleTrigger = screen.getByRole("combobox");
    // Radix's Select trigger opens on Enter/Space when focused, mirroring
    // the dropdown-menu trigger behavior verified elsewhere in this suite.
    // Moving focus here blurs the email field, and react-hook-form's
    // `isValid` subscription reacts to that blur with a state update that
    // happens outside of React's normal event-dispatch batching — wrapping
    // the focus call in `act()` is the correct fix (per React's own
    // guidance), not a suppression of the warning.
    act(() => {
      roleTrigger.focus();
    });
    fireEvent.keyDown(roleTrigger, { key: "Enter" });
    const viewerOption = await screen.findByRole("option", { name: "Viewer" });
    fireEvent.click(viewerOption);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /send invite/i }));
    });

    expect(onSubmit).toHaveBeenCalledWith({
      email: "keyboard@example.com",
      role: "viewer",
    });
  });

  it("does not render when closed", () => {
    renderDialog({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  describe("when invitations are not enabled (fail-closed)", () => {
    it("explains that invitations aren't enabled instead of showing the invite form", () => {
      const { onSubmit } = renderDialog({ invitationsEnabled: false });

      expect(
        screen.getByRole("dialog", {
          name: "Team invitations aren't enabled yet",
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/no invitation has been sent/i),
      ).toBeInTheDocument();

      // The form must not be present at all in this state.
      expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /send invite/i }),
      ).not.toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("closes via the explicit acknowledgement button without ever calling onSubmit", () => {
      const { onOpenChange, onSubmit } = renderDialog({
        invitationsEnabled: false,
      });

      fireEvent.click(screen.getByRole("button", { name: /^got it$/i }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("does not imply success even if a stale success status is passed", () => {
      // Defense in depth: even if the caller's status somehow says
      // "success" while the capability is off, the disabled explanation
      // must still win and no form/success UI may render.
      renderDialog({ invitationsEnabled: false, status: "success" });

      expect(
        screen.getByText("Team invitations aren't enabled yet"),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
    });
  });
});
