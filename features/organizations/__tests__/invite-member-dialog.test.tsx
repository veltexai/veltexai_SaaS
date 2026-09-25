/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { InviteMemberDialog } from "../components/invite-member-dialog";

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

  it("blocks submission and shows a validation message for an invalid email", async () => {
    const { onSubmit } = renderDialog();

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send invite/i }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
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

  it("keeps the dialog open and shows the server error when the submit fails", async () => {
    const onOpenChange = jest.fn();
    const onSubmit = jest.fn().mockResolvedValue(false);

    render(
      <InviteMemberDialog
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
        status="error"
        error="This email has already been invited to this organization."
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

  it("does not render when closed", () => {
    renderDialog({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
