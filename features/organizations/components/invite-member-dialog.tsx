"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { INVITABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "../constants/roles";
import {
  inviteMemberSchema,
  type InviteMemberFormValues,
} from "../schemas/invite-member";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Resolves true on success (dialog will reset + close) or false to keep it open with the current error shown. */
  onSubmit: (values: InviteMemberFormValues) => Promise<boolean>;
  status: "idle" | "loading" | "error" | "success";
  error: string | null;
  /**
   * Called instead of Radix's default close-focus behavior. This dialog is
   * opened from more than one trigger (a header button and the member
   * list's empty-state CTA), so the caller is responsible for restoring
   * focus to whichever one was used.
   */
  onAfterClose?: () => void;
  /**
   * Fail-closed capability gate. When `false`, this dialog never renders the
   * invite form and never calls `onSubmit` — it only explains that
   * invitations aren't enabled yet. This must not be bypassed: there is no
   * live invitation endpoint behind this UI (see
   * docs/product/platform-build/CURSOR_R2_CONTRACT_REQUEST.md).
   */
  invitationsEnabled: boolean;
}

const DEFAULT_VALUES: InviteMemberFormValues = {
  email: "",
  role: "estimator",
};

export function InviteMemberDialog({
  open,
  onOpenChange,
  onSubmit,
  status,
  error,
  onAfterClose,
  invitationsEnabled,
}: InviteMemberDialogProps) {
  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: DEFAULT_VALUES,
  });

  // Reset to a clean form every time the dialog opens.
  useEffect(() => {
    if (open) {
      form.reset(DEFAULT_VALUES);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isSubmitting = status === "loading";

  const handleSubmit = form.handleSubmit(async (values) => {
    const succeeded = await onSubmit(values);
    if (succeeded) {
      form.reset(DEFAULT_VALUES);
      onOpenChange(false);
    }
  });

  if (!invitationsEnabled) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-md motion-reduce:animate-none motion-reduce:duration-0"
          onCloseAutoFocus={(event) => {
            if (onAfterClose) {
              event.preventDefault();
              onAfterClose();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Team invitations aren&apos;t enabled yet</DialogTitle>
            <DialogDescription>
              This workspace can&apos;t send teammate invitations yet. No
              invitation has been sent and no teammate has been added to your
              roster.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This capability is being built out with Codex&apos;s
            organization service. Check back once it&apos;s enabled for your
            account.
          </p>
          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next);
      }}
    >
      <DialogContent
        className="sm:max-w-md motion-reduce:animate-none motion-reduce:duration-0"
        onCloseAutoFocus={(event) => {
          if (onAfterClose) {
            event.preventDefault();
            onAfterClose();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>
            They&apos;ll get access based on the role you choose. You can
            change or remove their access later.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="teammate@example.com"
                      autoComplete="email"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INVITABLE_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {ROLE_DESCRIPTIONS[field.value]}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {status === "error" && error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Sending invite…
                  </>
                ) : (
                  "Send invite"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
