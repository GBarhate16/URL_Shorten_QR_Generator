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
    default: "SaaS URL Shortener & QR Generator",
    template: "%s | SaaS URL Shortener",
  },
  description: "Shorten URLs and generate QR codes with advanced analytics and customization.",
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
  const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Analytics */}
        {enableAnalytics && googleAnalyticsId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}', {
                  page_title: document.title,
                  page_location: window.location.href,
                });
              `}
            </Script>
          </>
        )}
        
        {/* Service Worker Registration */}
        {process.env.NEXT_PUBLIC_ENABLE_SERVICE_WORKER === "true" && (
          <Script id="service-worker" strategy="afterInteractive">
            {`
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
              
                    })
                    .catch(function(registrationError) {
                      
                    });
                });
              }
            `}
          </Script>
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
