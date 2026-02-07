'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import z from 'zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import Link from 'next/link';
import { Loader2, Mail } from 'lucide-react';
import Image from 'next/image';
import Photo from '../../public/images/pexels-tima-miroshnichenko-6195879.jpg';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PasswordStength from '@/components/ui/password-stength';
import { signInWithGoogle } from '@/lib/auth/actions/oauth';
import { signUp } from '@/lib/auth/actions/password';
import FreeTrialInfoBanner from '../ui/free-trial-info-banner';

const formSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().optional(),
});

export default function SignupForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: '', email: '' });

  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      companyName: '',
    },
  });

  const signUpWithGoogle = async () => {
    setIsLoadingGoogle(true);
    try {
      const result = await signInWithGoogle();

      if (result.error) {
        toast.error(result.error?.message || 'Failed to sign in with Google');
        setIsLoadingGoogle(false);
      } else if (result.data?.url) {
        // Redirect to Google OAuth URL
        window.location.href = result.data.url;
        // Don't set loading to false since we're redirecting
      } else {
        toast.error('Failed to get Google sign-in URL');
        setIsLoadingGoogle(false);
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
      setIsLoadingGoogle(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', values.email);
      formData.append('password', values.password);
      formData.append('fullName', values.fullName);
      formData.append('companyName', values.companyName || '');
      const result = await signUp({}, formData);

      if (result?.error) {
        toast.error(result.error);
        if (
          result.error.toLowerCase().includes('already exists') ||
          result.error.toLowerCase().includes('email already')
        ) {
          router.push('/auth/login');
        }
      } else {
        // Show verification toast and modal
        toast.success('Please check your email to verify your account.');
        setUserInfo({ name: values.fullName, email: values.email });
        setShowVerificationDialog(true);
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }

  const resendVerificationEmail = async () => {
    try {
      // Supabase automatically sends verification email on signup
      // You can implement a resend function if needed
      toast.success('Please check your email for the verification link');
    } catch (error) {
      console.error('Resend verification error:', error);
      toast.error('Failed to resend verification email. Please try again.');
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden p-0 ">
        <CardContent className="grid p-0 md:grid-cols-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col items-center text-center">
                  <Image
                    width={200}
                    height={40}
                    src="/images/IMG_3800.png"
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
                <div className="flex items-center gap-3">
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
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Your Company Name"
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
                            <PasswordStength field={field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    'Sign Up'
                  )}
                </Button>

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
                    </svg>{' '}
                    Sign Up with Google
                  </Button>
                  <Link href="/auth/signup?method=magic">
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
                  Already have Account{' '}
                  <Link
                    href="/auth/login"
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
            <AlertDialogTitle>Verify your email</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Hi <strong>{userInfo.name}</strong>, you need to verify your email
              address to continue. Please click the confirmation link sent to{' '}
              <strong>{userInfo.email}</strong> to access your dashboard.
              <br />
              <br />
              <span className="text-sm text-muted-foreground">
                Don't see the email? Check your spam or junk folder.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-center">
            <Button onClick={resendVerificationEmail} className="w-full">
              Resend verification email
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
