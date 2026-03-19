"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Send, Loader2 } from "lucide-react";

import { sendProposalSchema } from "../schemas/send-proposal-schema";
import type { SendProposalFormData } from "../schemas/send-proposal-schema";
import { DELIVERY_METHOD_OPTIONS } from "../constants/delivery-methods";
import { buildSendProposalDefaults } from "../utils/proposal-form-defaults";
import { useSendProposal } from "../hooks/use-send-proposal";
import { DeliveryMethodCard } from "./detail/delivery-method-card";
import { SendResultView } from "./detail/send-result-view";
import { SendProgressAlert } from "./detail/send-progress-alert";
import type { SendModalProposal } from "../utils/send-modal-proposal";

interface SendProposalModalProps {
  proposal: SendModalProposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SendProposalModal({
  proposal,
  open,
  onOpenChange,
  onSuccess,
}: SendProposalModalProps) {
  // ── Hook owns ALL send lifecycle state ─────────────────────────────────────
  const { isSending, progress, result, handleSend, resetResult } =
    useSendProposal();

  // ── Form owns ALL input state ───────────────────────────────────────────────
  const form = useForm<SendProposalFormData>({
    resolver: zodResolver(sendProposalSchema),
    defaultValues: buildSendProposalDefaults(proposal),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleFormSubmit = useCallback(
    async (data: SendProposalFormData) => {
      await handleSend(proposal.id, data);
      // Auto-close on success after 2 s
      if (result?.success) {
        setTimeout(() => {
          onOpenChange(false);
          onSuccess?.();
        }, 2000);
      }
    },
    [handleSend, proposal.id, result, onOpenChange, onSuccess],
  );

  const handleSendAnother = useCallback(() => {
    resetResult();
    form.reset(buildSendProposalDefaults(proposal));
  }, [resetResult, form, proposal]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" aria-hidden="true" />
            Send Proposal
          </DialogTitle>
          <DialogDescription>
            Send &ldquo;{proposal.title}&rdquo; to{" "}
            {proposal.client_name ?? "your client"}
          </DialogDescription>
        </DialogHeader>

        {/* ── Post-send: show outcome ── */}
        {result ? (
          <SendResultView
            result={result}
            onSendAnother={handleSendAnother}
            onClose={handleClose}
          />
        ) : (
          /* ── Pre-send: show form ── */
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleFormSubmit)}
              className="space-y-6"
            >
              {/* Delivery Method */}
              <FormField
                control={form.control}
                name="delivery_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Method</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-1 gap-4"
                      >
                        {DELIVERY_METHOD_OPTIONS.map((option) => (
                          <DeliveryMethodCard
                            key={option.value}
                            option={option}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Email Details */}
              <section
                aria-labelledby="email-details-heading"
                className="space-y-4"
              >
                <h3 id="email-details-heading" className="text-lg font-medium">
                  Email Details
                </h3>

                <FormField
                  control={form.control}
                  name="recipient_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="client@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cc_emails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CC Emails (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="email1@example.com, email2@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Separate multiple emails with commas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input type="text" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={8}
                          placeholder="Enter your message..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Personalize your message to the client
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <Separator />

              {/* Options */}
              <section aria-labelledby="options-heading" className="space-y-4">
                <h3 id="options-heading" className="text-lg font-medium">
                  Options
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="include_company_branding"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Include Company Branding</FormLabel>
                          <FormDescription>
                            Apply your company colors and logo
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="send_copy_to_self"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Send Copy to Self</FormLabel>
                          <FormDescription>
                            Receive a copy of the sent proposal
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* Progress (only visible while sending) */}
              {isSending && progress && (
                <SendProgressAlert message={progress} />
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSending}>
                  {isSending ? (
                    <>
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                      Send Proposal
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}

        <footer className="flex items-center justify-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <span className="font-semibold text-blue-600">Veltex AI</span>
          </p>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
