'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { PasswordInput } from '@/components/ui/password-input';
import Photo from '../../public/images/pexels-tima-miroshnichenko-6196692.jpg';
import { signIn } from '@/lib/auth/actions/password';
import { signInWithGoogle } from '@/lib/auth/actions/oauth';

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginForm = ({ className, ...props }: React.ComponentProps<'form'>) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('password', values.password);
    const { error } = await signIn({}, formData);

    if (error) {
      toast.error(error);
    } else {
      toast.success('Login successful');
      router.push('/dashboard');
    }

    setIsLoading(false);
  }

  const handleGoogleSignIn = async () => {
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

  return (
    <section className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2 h-full">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 md:p-8">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <Image
                    width={200}
                    height={40}
                    src="/images/IMG_3800.png"
                    alt="Image"
                    className="mx-auto"
                  />
                  <p className="text-muted-foreground text-balance mt-3.5">
                    Generate Professional Cleaning Proposals <br />in Minutes
                  </p>
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
                            <PasswordInput {...field} placeholder="********" />
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
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    'Login'
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
                    Login with Google
                  </Button>
                  <Link href="/auth/login?method=magic">
                    <Button
                      variant="outline"
                      type="button"
                      className="w-full flex items-center gap-2"
                    >
                      <Mail className="size-4" />
                      Login With Magic Link
                    </Button>
                  </Link>
                </div>
                <div className="text-center text-sm">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/auth/signup"
                    className="underline underline-offset-4"
                  >
                    Sign up
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
