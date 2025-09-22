import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AuthProvider } from "@/contexts/auth-context";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { Providers } from "@/components/providers";
import { NotificationsProvider } from "@/contexts/notifications-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "100xEngineers",
  description: "A centralized hub for managing and showcasing web applications",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/100xicon.png" type="image/jpeg" />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <Providers>
          <SiteHeader />
          <main className="flex-1">
            <SpeedInsights />
            {children}
            <Analytics />
          </main>
          <SiteFooter />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
