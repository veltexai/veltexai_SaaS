import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication - Veltex',
  description: 'Sign in to your Veltex account or create a new one.',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
      <div className="w-full space-y-8">
        {/* <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Veltex</h1>
          <p className="mt-2 text-sm text-gray-600">
            Professional Proposal Generation Platform
          </p>
        </div> */}
        {children}
      </div>
    </div>
  );
}
