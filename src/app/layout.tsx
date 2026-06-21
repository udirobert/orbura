import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DM_Serif_Display, Instrument_Sans } from "next/font/google";
import { EazoProvider } from "@/lib/sdk/eazo-react";
import { cn } from "@/utils/utils";
import { Toaster } from "@/components/ui/sonner";
import { UserSyncEffect } from "@/components/user-profile/user-sync-effect";
import { PageTransition } from "@/components/PageTransition";
import { WagmiProviderWrapper } from "@/components/providers/WagmiProviderWrapper";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
});
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

// Public origin used to resolve relative URLs in OG / Twitter Card tags
// and `canonical`. Picks up Vercel's auto-injected hostname; on other
// hosts (or when using a custom domain whose OG should not show the
// `*.vercel.app` URL), point `metadataBase` at the canonical URL
// directly instead of relying on this.
const SITE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;

const SITE_TITLE = "BODY DEBT";
const SITE_DESCRIPTION =
  "Your body keeps the score. Quantify recovery debt from alcohol, sleep, training, and stress.";

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // Favicon chain — all file-based metadata so Next.js auto-emits
  // the <link> tags:
  //   • src/app/icon.svg     → <link rel="icon" type="image/svg+xml">
  //                            for Chrome, Firefox, Edge.
  //   • src/app/apple-icon.png → <link rel="apple-touch-icon"> for iOS.
  //   • public/favicon.ico   → Safari + legacy browsers fetch
  //                            /favicon.ico directly.
  // Social preview cards (Open Graph + Twitter). Most platforms (X,
  // Facebook, LinkedIn, Slack, Discord, WeChat, iMessage) read these
  // tags directly. For the preview image, drop a 1200×630 PNG/JPG at
  // `src/app/opengraph-image.png` — Next.js auto-detects file-based
  // metadata and overrides `openGraph.images` below at build time.
  openGraph: {
    type: "website",
    siteName: "BODY DEBT",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased",
        dmSerif.variable,
        instrumentSans.variable
      )}
    >
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-sans)" }}>
        <EazoProvider>
          <WagmiProviderWrapper>
            <UserSyncEffect />
            <ServiceWorkerRegister />
            <PageTransition>
              {children}
            </PageTransition>
            <Toaster />
          </WagmiProviderWrapper>
        </EazoProvider>
      </body>
    </html>
  );
}
