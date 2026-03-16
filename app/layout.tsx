import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { montserrat, dmSerifText, arvo } from "@/lib/fonts";
import "./globals.css";
import { Toaster } from "sonner";
import { ConfirmationProvider } from "@/providers/confirmation-provider";
import MetaPixel from "@/components/MetaPixel";
import MetaPixelTracker from "@/components/MetaPixelTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Veltex AI",
  description: "Generate your proposal with Veltex AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Adobe Typekit: Bely font */}
        <link rel="stylesheet" href="https://use.typekit.net/njd2wnv.css" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${dmSerifText.variable} ${arvo.variable} antialiased`}
      >
        <MetaPixel />
        <MetaPixelTracker />
        <ConfirmationProvider>
          {children}
          <Toaster />
        </ConfirmationProvider>
      </body>
    </html>
  );
}
