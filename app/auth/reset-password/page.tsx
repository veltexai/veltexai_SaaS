import ResetPasswordForm from '@/components/forms/reset-password-form';
import { Suspense } from 'react';

export default function ResetPasswordPage() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
