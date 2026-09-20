"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FieldErrors, useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/ui/password-input";
import Photo from "../../../public/images/pexels-tima-miroshnichenko-6196692.jpg";
import {
  resendSignupVerification,
  signIn,
} from "@/features/auth/actions/password";
import { signInWithGoogle } from "@/features/auth/actions/oauth";
import { buildAuthPathWithRedirect } from "@/features/auth/utils/redirect";
import { trackGoogleEvent } from "@/lib/analytics/google-analytics";

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

interface LoginFormProps extends React.ComponentProps<"form"> {
  redirectTo?: string;
  notice?: string;
}

const LoginForm = ({ className, redirectTo, notice, ...props }: LoginFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [lastLoginMethod, setLastLoginMethod] = useState<"google" | "password" | null>(null);
  const interactedFields = useRef(new Set<string>());
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const storedMethod = window.localStorage.getItem("veltex_last_login_method");
    if (storedMethod === "google" || storedMethod === "password") {
      setLastLoginMethod(storedMethod);
    }
    trackGoogleEvent("login_form_view", {
      form_name: "account_login",
      page_path: "/auth/login",
    });
  }, []);

  const trackFirstInteraction = (fieldName: keyof z.infer<typeof formSchema>) => {
    if (interactedFields.current.has(fieldName)) return;
    interactedFields.current.add(fieldName);
    trackGoogleEvent("login_form_interaction", {
      form_name: "account_login",
      field_name: fieldName,
    });
  };

  const onInvalid = (errors: FieldErrors<z.infer<typeof formSchema>>) => {
    setLoginError("Please check the highlighted fields and try again.");
    trackGoogleEvent("login_validation_error", {
      form_name: "account_login",
      error_fields: Object.keys(errors).sort().join(","),
      error_count: Object.keys(errors).length,
    });
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setLoginError("");
    trackGoogleEvent("login_submit", {
      form_name: "account_login",
      method: "password",
    });
    const formData = new FormData();
    formData.append("email", values.email);
    formData.append("password", values.password);
    if (redirectTo) {
      formData.append("redirectTo", redirectTo);
    }
    const { error } = await signIn({}, formData);

    if (error) {
      setLoginError(error);
      trackGoogleEvent("login_submit_error", {
        form_name: "account_login",
        method: "password",
        error_category: "authentication_error",
      });
      toast.error(error);
    } else {
      window.localStorage.setItem("veltex_last_login_method", "password");
      trackGoogleEvent("login_success", {
        form_name: "account_login",
        method: "password",
      });
      toast.success("Login successful");
      router.push(redirectTo || "/dashboard");
    }

    setIsLoading(false);
  }

  const handleGoogleSignIn = async () => {
    setIsLoadingGoogle(true);
    setLoginError("");
    trackGoogleEvent("login_submit", {
      form_name: "account_login",
      method: "google",
    });
    try {
      const result = await signInWithGoogle(undefined, redirectTo);

      if (result.error) {
        setLoginError(result.error?.message || "Google login could not be started.");
        trackGoogleEvent("login_submit_error", {
          form_name: "account_login",
          method: "google",
          error_category: "oauth_start_error",
        });
        toast.error(result.error?.message || "Failed to sign in with Google");
        setIsLoadingGoogle(false);
      } else if (result.data?.url) {
        window.localStorage.setItem("veltex_last_login_method", "google");
        // Redirect to Google OAuth URL
        window.location.href = result.data.url;
        // Don't set loading to false since we're redirecting
      } else {
        setLoginError("Google login could not be started. Please try another method.");
        toast.error("Failed to get Google sign-in URL");
        setIsLoadingGoogle(false);
      }
    } catch {
      setLoginError("Google login could not be started. Please try another method.");
      toast.error("An error occurred. Please try again.");
      setIsLoadingGoogle(false);
    }
  };

  const resendVerification = async () => {
    const email = form.getValues("email");
    if (!z.string().email().safeParse(email).success) {
      setLoginError("Enter your email address first, then resend verification.");
      form.setFocus("email");
      return;
    }

    setIsResending(true);
    const formData = new FormData();
    formData.append("email", email);
    if (redirectTo) formData.append("redirectTo", redirectTo);
    try {
      const result = await resendSignupVerification({}, formData);
      if (result?.error) {
        setLoginError(result.error);
      } else {
        setLoginError("");
        toast.success("Verification email sent. Please check your inbox.");
      }
    } catch {
      setLoginError("We could not resend verification. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <section className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2 h-full">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, onInvalid)}
              className="p-5 sm:p-6 md:p-8"
            >
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <Image
                    width={200}
                    height={40}
                    src="/images/IMG_3800.webp"
                    alt="Image"
                    className="mx-auto"
                  />
                  <h1 className="mt-4 text-2xl font-semibold">Welcome back</h1>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Continue where you left off.
                  </p>
                </div>
                <div className="grid gap-2">
                  {notice && (
                    <p
                      role="status"
                      className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
                    >
                      {notice}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full flex items-center gap-2"
                    onClick={handleGoogleSignIn}
                    disabled={isLoadingGoogle}
                  >
                    {isLoadingGoogle ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        height={16}
                        width={16}
                      >
                        <path
                          d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                    Continue with Google
                  </Button>
                  {lastLoginMethod === "google" && (
                    <p className="text-muted-foreground text-center text-xs">Previously used on this device</p>
                  )}
                </div>
                <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                  <span className="bg-card text-muted-foreground relative z-10 px-2">
                    or continue with email
                  </span>
                </div>
                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
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
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <PasswordInput
                              {...field}
                              autoComplete="current-password"
                              placeholder="Enter your password"
                              onFocus={() => trackFirstInteraction("password")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Link
                      href="/auth/forgot-password"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                </div>
                {loginError && (
                  <div className="space-y-2">
                    <p role="alert" className="text-destructive text-sm" aria-live="polite">
                      {loginError}
                    </p>
                    {loginError.toLowerCase().includes("not verified") && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={resendVerification}
                        disabled={isResending}
                      >
                        {isResending ? <Loader2 className="size-4 animate-spin" /> : "Resend verification email"}
                      </Button>
                    )}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Log in"
                  )}
                </Button>
                {lastLoginMethod === "password" && (
                  <p className="text-muted-foreground -mt-4 text-center text-xs">
                    Previously used on this device
                  </p>
                )}
                <div className="grid gap-4">
                  <Link
                    href={buildAuthPathWithRedirect({
                      pathname: "/auth/login",
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
                      Email me a secure login link
                    </Button>
                  </Link>
                </div>
                <div className="text-center text-sm">
                  New to Veltex AI?{" "}
                  <Link
                    href={buildAuthPathWithRedirect({
                      pathname: "/auth/signup",
                      redirectTo,
                    })}
                    className="underline underline-offset-4"
                  >
                    Start your free trial
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
    </section>
  );
};

export default LoginForm;
