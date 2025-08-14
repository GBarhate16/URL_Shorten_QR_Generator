import type { Metadata } from "next";
import { JetBrains_Mono, Noto_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { NotificationContainer } from "@/components/notification-container";
import Script from "next/script";
export const viewport = { themeColor: "#000000" };

const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-sans" });
const jbMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "SaaS URL Shortener",
    template: "%s | SaaS URL Shortener",
  },
  description: "Shorten and manage your links.",
  icons: {
    icon: "/favicon.ico",
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const enableAnalytics = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true";
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {enableAnalytics && (
          <Script
            src={process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL || "https://plausible.gonzalochale.dev/js/script.outbound-links.js"}
            strategy="afterInteractive"
            data-domain={process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN || "localhost"}
          />
        )}
      </head>
      <body className={`${notoSans.variable} ${jbMono.variable} antialiased font-sans`}>
        <Providers>
          {children}
          <NotificationContainer />
        </Providers>
      </body>
    </html>
  );
}
