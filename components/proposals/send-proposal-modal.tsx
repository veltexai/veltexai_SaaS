'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Send,
  Mail,
  FileText,
  Link,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AIEmailGenerator } from '@/components/emails/ai-email-generator';

const sendProposalSchema = z.object({
  delivery_method: z.enum(['pdf_only'], {
    required_error: 'Please select a delivery method',
  }),
  recipient_email: z.string().email('Please enter a valid email address'),
  cc_emails: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  include_company_branding: z.boolean(),
  send_copy_to_self: z.boolean(),
  track_downloads: z.boolean(),
});

type SendProposalFormData = z.infer<typeof sendProposalSchema>;

interface Proposal {
  id: string;
  title: string;
  client_name?: string;
  client_email?: string;
  client_company?: string;
  service_type?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
}

interface SendProposalModalProps {
  proposal: Proposal;
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
  const [sending, setSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState('');
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    message: string;
    trackingId?: string;
    errorCode?: string;
    errorDetails?: string;
  } | null>(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const form = useForm<SendProposalFormData>({
    resolver: zodResolver(sendProposalSchema),
    defaultValues: {
      delivery_method: 'pdf_only',
      recipient_email: proposal.client_email || '',
      cc_emails: '',
      subject: `Proposal: ${proposal.title}`,
      message: `Dear ${proposal.client_name || 'Valued Client'},

I hope this message finds you well. I'm pleased to present our detailed proposal for your cleaning service needs.

This proposal includes:
• Comprehensive service overview
• Detailed pricing breakdown
• Our commitment to quality and reliability
• Next steps for moving forward

Please review the attached proposal and don't hesitate to reach out if you have any questions or would like to discuss any aspects in detail.

I look forward to the opportunity to serve you.

Best regards,
Veltex AI Team`,
      include_company_branding: true,
      send_copy_to_self: false,
      track_downloads: true,
    },
  });

  const watchedDeliveryMethod = form.watch('delivery_method');

  const onSubmit = async (data: SendProposalFormData) => {
    setSending(true);
    setSendResult(null);
    setSendingProgress('');

    try {
      // Show progress: Step 1
      setSendingProgress('Preparing proposal... ⚙️');
      await new Promise((resolve) => setTimeout(resolve, 500)); // Brief pause for UX

      // Show progress: Step 2
      setSendingProgress('Generating PDF (Fonts, Images, etc.) 📄 (this may take 30 seconds)');

      const response = await fetch(`/api/proposals/${proposal.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          cc_emails: data.cc_emails
            ? data.cc_emails.split(',').map((email) => email.trim())
            : [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.message || errorData.error || 'Failed to send proposal');
        (error as Error & { cause: object }).cause = {
          code: errorData.code,
          details: errorData.details,
        };
        throw error;
      }

      // Show progress: Step 3
      setSendingProgress('PDF generated! Sending email... 📧');

      const result = await response.json();

      setSendingProgress('Email sent successfully! ✅');

      setSendResult({
        success: true,
        message: 'Proposal sent successfully!',
        trackingId: result.trackingId,
      });

      toast.success('Proposal sent successfully!');

      // Close modal after a short delay
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
      }, 2000);
    } catch (error) {
      console.error('Error sending proposal:', error);
      
      let errorMessage = 'An unexpected error occurred while sending the proposal.';
      let errorCode = 'UNKNOWN_ERROR';
      let errorDetails: string | undefined;

      if (error instanceof Error) {
        // Check for network errors
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
          errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
          errorCode = 'NETWORK_ERROR';
        } else {
          errorMessage = error.message;
        }
      }

      // Handle structured error responses from the API
      if (error instanceof Error && error.cause) {
        const cause = error.cause as { code?: string; details?: string };
        errorCode = cause.code || errorCode;
        errorDetails = cause.details;
      }

      setSendingProgress('');
      setSendResult({
        success: false,
        message: errorMessage,
        errorCode,
        errorDetails,
      });

      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const getDeliveryMethodDescription = (method: string) => {
    switch (method) {
      case 'pdf_only':
        return 'Send proposal as PDF attachment via email';
      case 'online_only':
        return 'Send secure online link to view proposal';
      case 'both':
        return 'Send both PDF attachment and online viewing link';
      default:
        return '';
    }
  };

  const resetForm = () => {
    setSendResult(null);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Proposal
          </DialogTitle>
          <DialogDescription>
            Send "{proposal.title}" to {proposal.client_name || 'your client'}
          </DialogDescription>
        </DialogHeader>

        {sendResult ? (
          <div className="space-y-4">
            <Alert
              className={
                sendResult.success
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }
            >
              <div className="flex items-start gap-2">
                {sendResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 space-y-1">
                  <AlertDescription
                    className={
                      sendResult.success ? 'text-green-800' : 'text-red-800 font-medium'
                    }
                  >
                    {sendResult.message}
                  </AlertDescription>
                  {!sendResult.success && sendResult.errorCode && (
                    <p className="text-xs text-red-600">
                      Error Code: {sendResult.errorCode}
                    </p>
                  )}
                  {!sendResult.success && sendResult.errorDetails && (
                    <p className="text-xs text-red-500 mt-1">
                      Details: {typeof sendResult.errorDetails === 'string' 
                        ? sendResult.errorDetails 
                        : JSON.stringify(sendResult.errorDetails)}
                    </p>
                  )}
                </div>
              </div>
            </Alert>

            {sendResult.success && sendResult.trackingId && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Tracking Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Tracking ID:
                      </span>
                      <Badge variant="outline">{sendResult.trackingId}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-blue-500" />
                        <span className="text-blue-600">Sent</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2">
              {sendResult.success ? (
                <>
                  <Button variant="outline" onClick={resetForm}>
                    Send Another
                  </Button>
                  <Button onClick={() => onOpenChange(false)}>Close</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button onClick={resetForm}>
                    Try Again
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        defaultValue={field.value}
                        className="grid grid-cols-1 gap-4"
                      >
                        <div className="flex items-center space-x-2 border rounded-lg p-4">
                          <RadioGroupItem value="pdf_only" id="pdf_only" />
                          <div className="flex-1">
                            <Label
                              htmlFor="pdf_only"
                              className="flex items-center gap-2 font-medium"
                            >
                              <FileText className="h-4 w-4" />
                              PDF Attachment Only
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Send proposal as PDF attachment via email
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 border rounded-lg p-4 opacity-50 cursor-not-allowed">
                          <RadioGroupItem
                            value="online_only"
                            id="online_only"
                            disabled
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor="online_only"
                              className="flex items-center gap-2 font-medium text-muted-foreground"
                            >
                              <Link className="h-4 w-4" />
                              Online Link Only
                              <Badge variant="outline" className="ml-2">
                                Phase 2
                              </Badge>
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Send secure online link to view proposal (Coming
                              Soon)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 border rounded-lg p-4 opacity-50 cursor-not-allowed">
                          <RadioGroupItem value="both" id="both" disabled />
                          <div className="flex-1">
                            <Label
                              htmlFor="both"
                              className="flex items-center gap-2 font-medium text-muted-foreground"
                            >
                              <Mail className="h-4 w-4" />
                              Both PDF & Online Link
                              <Badge variant="outline" className="ml-2">
                                Phase 2
                              </Badge>
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Send both PDF attachment and online viewing link
                              (Coming Soon)
                            </p>
                          </div>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Email Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Email Details</h3>

                <FormField
                  control={form.control}
                  name="recipient_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Email</FormLabel>
                      <FormControl>
                        <Input placeholder="client@example.com" {...field} />
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
                        <Input {...field} />
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
                      <FormLabel className="flex items-center justify-between">
                        Message
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAIGenerator(!showAIGenerator)}
                          disabled
                        >
                          <Wand2 className="mr-2 h-4 w-4" />
                          {showAIGenerator
                            ? 'Hide AI Generator'
                            : 'Use AI Generator'}
                          <Badge variant="outline" className="ml-2">
                            Phase 2
                          </Badge>
                        </Button>
                      </FormLabel>
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

                {/* AI Email Generator */}
                {showAIGenerator && (
                  <AIEmailGenerator
                    emailType="proposal_send"
                    proposalTitle={proposal.title}
                    clientName={proposal.client_name || ''}
                    clientCompany={proposal.client_company}
                    serviceType={proposal.service_type}
                    onSubjectGenerated={(subject) =>
                      form.setValue('subject', subject)
                    }
                    onMessageGenerated={(message) =>
                      form.setValue('message', message)
                    }
                    onError={(error) => toast.error(error)}
                    className="mt-4"
                  />
                )}
              </div>

              <Separator />

              {/* Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Options</h3>

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

                  {/* <FormField
                    control={form.control}
                    name="track_downloads"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Track Downloads</FormLabel>
                          <FormDescription>
                            Get notified when PDF is downloaded
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  /> */}
                </div>
              </div>

              {/* Progress Message */}
              {sending && sendingProgress && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <AlertDescription className="text-blue-800 ml-2">
                    {sendingProgress}
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Proposal
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* Powered by Veltex AI */}
        <div className="flex items-center justify-center pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Powered by{' '}
            <span className="font-semibold text-blue-600">Veltex AI</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
