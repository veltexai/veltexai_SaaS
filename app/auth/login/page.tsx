import LoginForm from '@/components/forms/login-form';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center px-6 md:px-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm />
      </div>
    </div>
  );
}
