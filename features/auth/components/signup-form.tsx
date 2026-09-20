"use client";

import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import z from "zod";
import { FieldErrors, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import Image from "next/image";
import Photo from "../../../public/images/pexels-tima-miroshnichenko-6195879.jpg";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PasswordStength from "@/components/ui/password-stength";
import { signInWithGoogle } from "@/features/auth/actions/oauth";
import {
  resendSignupVerification,
  signUp,
} from "@/features/auth/actions/password";
import FreeTrialInfoBanner from "@/components/ui/free-trial-info-banner";
import { buildAuthPathWithRedirect } from "@/features/auth/utils/redirect";
import { trackGoogleEvent } from "@/lib/analytics/google-analytics";

const formSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().optional(),
});

export default function SignupForm({
  className,
  redirectTo,
  ...props
}: React.ComponentProps<"div"> & { redirectTo?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [accountAlreadyExists, setAccountAlreadyExists] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: "", email: "" });
  const interactedFields = useRef(new Set<string>());

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      companyName: "",
    },
  });

  useEffect(() => {
    trackGoogleEvent("signup_form_view", {
      form_name: "email_signup",
      page_path: "/auth/signup",
    });
  }, []);

  const trackFirstInteraction = (fieldName: keyof z.infer<typeof formSchema>) => {
    if (interactedFields.current.has(fieldName)) return;
    interactedFields.current.add(fieldName);
    trackGoogleEvent("signup_form_interaction", {
      form_name: "email_signup",
      field_name: fieldName,
    });
  };

  const onInvalid = (errors: FieldErrors<z.infer<typeof formSchema>>) => {
    trackGoogleEvent("signup_validation_error", {
      form_name: "email_signup",
      error_fields: Object.keys(errors).sort().join(","),
      error_count: Object.keys(errors).length,
    });
  };

  const signUpWithGoogle = async () => {
    setIsLoadingGoogle(true);
    try {
      const result = await signInWithGoogle(undefined, redirectTo, "signup");

      if (result.error) {
        toast.error(result.error?.message || "Failed to sign in with Google");
        setIsLoadingGoogle(false);
      } else if (result.data?.url) {
        // Redirect to Google OAuth URL
        window.location.href = result.data.url;
        // Don't set loading to false since we're redirecting
      } else {
        toast.error("Failed to get Google sign-in URL");
        setIsLoadingGoogle(false);
      }
    } catch {
      toast.error("An error occurred. Please try again.");
      setIsLoadingGoogle(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    trackGoogleEvent("signup_submit", {
      form_name: "email_signup",
      method: "email_password",
    });

    try {
      const formData = new FormData();
      formData.append("email", values.email);
      formData.append("password", values.password);
      formData.append("fullName", values.fullName);
      formData.append("companyName", values.companyName || "");
      if (redirectTo) {
        formData.append("redirectTo", redirectTo);
      }
      const result = await signUp({}, formData);

      if (result?.error) {
        const normalizedError = result.error.toLowerCase();
        const errorCategory =
          normalizedError.includes("already exists") ||
          normalizedError.includes("email already")
            ? "account_exists"
            : "submission_error";
        trackGoogleEvent("signup_submit_error", {
          form_name: "email_signup",
          method: "email_password",
          error_category: errorCategory,
        });
        toast.error(result.error);
        if (
          result.error.toLowerCase().includes("already exists") ||
          result.error.toLowerCase().includes("email already")
        ) {
          setUserInfo({ name: values.fullName, email: values.email });
          setAccountAlreadyExists(true);
          setShowVerificationDialog(true);
        }
      } else {
        trackGoogleEvent("signup_verification_prompt", {
          form_name: "email_signup",
          method: "email_password",
        });
        // Show verification toast and modal
        toast.success("Please check your email to verify your account.");
        setUserInfo({ name: values.fullName, email: values.email });
        setAccountAlreadyExists(false);
        setShowVerificationDialog(true);
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  const resendVerificationEmail = async () => {
    setIsResending(true);
    try {
      const formData = new FormData();
      formData.append("email", userInfo.email);
      if (redirectTo) formData.append("redirectTo", redirectTo);
      const result = await resendSignupVerification({}, formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Verification email sent. Please check your inbox.");
    } catch (error) {
      console.error("Resend verification error:", error);
      toast.error("Failed to resend verification email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0 ">
        <CardContent className="grid p-0 md:grid-cols-2">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, onInvalid)}
              className="p-5 sm:p-6 md:p-8"
            >
              <div className="flex flex-col gap-5">
                <div className="flex flex-col items-center text-center">
                  <Image
                    width={200}
                    height={40}
                    src="/images/IMG_3800.webp"
                    alt="Image"
                    className="mx-auto"
                  />
                  <p className="text-muted-foreground text-balance mt-3.5">
                    AI Operating System for Janitorial Companies — <br />
                    Scope → Labor → Pricing → Proposal
                  </p>
                </div>

                {/* Free Trial Info Banner */}
                <FreeTrialInfoBanner component="signup" />
                <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Full Name <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Your Full Name"
                            autoComplete="name"
                            onFocus={() => trackFirstInteraction("fullName")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Company Name <span className="text-muted-foreground text-xs">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Your Company Name"
                            autoComplete="organization"
                            onFocus={() => trackFirstInteraction("companyName")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Email <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="m@example.com"
                            autoComplete="email"
                            inputMode="email"
                            onFocus={() => trackFirstInteraction("email")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-3">
                  <div className="flex flex-col items-center">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel>
                            Password <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div
                              onFocus={() => trackFirstInteraction("password")}
                              className="scroll-mb-40"
                            >
                              <PasswordStength field={field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-muted-foreground text-center text-xs leading-5">
                    Next: verify your email, then create your first proposal. No credit card required.
                  </p>
                  <div className="sticky bottom-3 z-20 sm:static">
                    <Button
                      type="submit"
                      className="w-full shadow-lg sm:shadow-none"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Start free trial"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                  <span className="bg-card text-muted-foreground relative z-10 px-2">
                    Or continue with
                  </span>
                </div>

                <div className="grid gap-4">
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full"
                    onClick={signUpWithGoogle}
                    disabled={isLoadingGoogle}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                      />
                    </svg>{" "}
                    Sign Up with Google
                  </Button>
                  <Link
                    href={buildAuthPathWithRedirect({
                      pathname: "/auth/signup",
                      redirectTo,
                      params: { method: "magic" },
                    })}
                  >
                    <Button
                      variant="outline"
                      type="button"
                      className="w-full flex items-center gap-2"
                    >
                      <Mail className="size-4" />
                      Magic Link
                    </Button>
                  </Link>
                </div>

                <div className="text-center text-sm">
                  Already have Account{" "}
                  <Link
                    href={buildAuthPathWithRedirect({
                      pathname: "/auth/login",
                      redirectTo,
                    })}
                    className="underline underline-offset-4"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </form>
          </Form>
          <div className="bg-muted relative hidden md:block">
            <Image
              width={1000}
              height={1000}
              src={Photo}
              alt="Image"
              className="absolute inset-0 !h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
              placeholder="blur"
              layout="responsive"
            />
          </div>
        </CardContent>
      </Card>
      <AlertDialog
        open={showVerificationDialog}
        onOpenChange={setShowVerificationDialog}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="flex flex-col items-center justify-center">
            <Image
              className="dark:invert"
              src="/images/Email_verification.svg"
              alt="email verification icon"
              width={180}
              height={38}
              priority
            />
            <AlertDialogTitle>
              {accountAlreadyExists ? "You already have an account" : "Verify your email"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {accountAlreadyExists ? (
                <>
                  An account already exists for <strong>{userInfo.email}</strong>.
                  If it is verified, log in. If not, resend the verification email.
                </>
              ) : (
                <>
                  Hi <strong>{userInfo.name}</strong>, you need to verify your email
                  address to continue. Please click the confirmation link sent to{" "}
                  <strong>{userInfo.email}</strong> to access your dashboard.
                </>
              )}
              <br />
              <br />
              <span className="text-sm text-muted-foreground">
                Don&apos;t see the email? Check your spam or junk folder.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              onClick={resendVerificationEmail}
              className="w-full"
              disabled={isResending}
            >
              {isResending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Resend verification email"
              )}
            </Button>
            <Button asChild variant="secondary">
              <Link
                href={buildAuthPathWithRedirect({
                  pathname: "/auth/login",
                  redirectTo,
                })}
              >
                Log in instead
              </Link>
            </Button>
            <AlertDialogCancel className="sm:col-span-2">
              Close
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
