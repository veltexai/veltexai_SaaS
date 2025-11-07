import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { montserrat, dmSerifText } from '@/lib/fonts';
import './globals.css';
import { Toaster } from 'sonner';
import { ConfirmationProvider } from '@/components/providers/confirmation-provider';
import FacebookPixel from '../components/FacebookPixel';
import FacebookPixelTracker from '@/components/FacebookPixelTracker';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Veltex AI',
  description: 'Generate your proposal with Veltex AI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${dmSerifText.variable} antialiased`}
      >
        <FacebookPixel />
        <FacebookPixelTracker />
        <ConfirmationProvider>
          {children}
          <Toaster />
        </ConfirmationProvider>
      </body>
    </html>
  );
}
