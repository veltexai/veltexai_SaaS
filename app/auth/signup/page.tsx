import SignupForm from '@/components/forms/signup-form';

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center justify-center px-6 md:px-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <SignupForm />
      </div>
    </div>
  );
}
