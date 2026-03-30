import { Geist, Geist_Mono } from "next/font/google";
import { montserrat, dmSerifText, arvo } from "@/lib/fonts";
import "./globals.css";
import { Toaster } from "sonner";
import { ConfirmationProvider } from "@/providers/confirmation-provider";
import MetaPixel from "@/components/MetaPixel";
import MetaPixelTracker from "@/components/MetaPixelTracker";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to Typekit so the DNS + TLS handshake is done early */}
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="" />
        <link rel="dns-prefetch" href="https://use.typekit.net" />
        {/* Preload the hero dashboard image — browser fetches it during HTML parse,
            before JS runs, so it's ready when VideoPlayer mounts */}
        <link
          rel="preload"
          as="image"
          href="/images/dashboard-light.webp"
          fetchPriority="high"
        />
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
        {/* Adobe Typekit: load async so it never blocks rendering or LCP */}
        <Script id="typekit-loader" strategy="afterInteractive">{`
          (function(){
            var l=document.createElement('link');
            l.rel='stylesheet';
            l.href='https://use.typekit.net/njd2wnv.css';
            document.head.appendChild(l);
          })();
        `}</Script>
      </body>
    </html>
  );
}
